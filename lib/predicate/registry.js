import path from 'path';
import net from 'net';
import stream from 'stream';
import { errors } from 'arsenal';
import validate from './validate';
import RequestWrapper from './requestWrapper';
import { OUTPUT as OUTPUT_SYM } from './requestWrapper';

const eventTypes = {
    'ObjectCreated:Put': 'ObjectCreated:Put',
    'objectPut': 'ObjectCreated:Put',
    // currently no AWS notification for gets so made this
    // terminology up.  see http://docs.aws.amazon.com/
    // AmazonS3/latest/dev/NotificationHowTo.html#notification-how-to
    // -event-types-and-destinations
    'ObjectRetrieved:Get': 'ObjectRetrieved:Get',
    'objectGet': 'ObjectRetrieved:Get',
};

const bucketNameRe = /^[\w\-\.]+$/;
const metadataRe = /^x\-amz\-meta\-([\w\-]+)$/;

function cannonicalizeEventName(v) {
    if (!v || typeof v !== 'string') {
        return false;
    }
    const eventName = eventTypes[v];
    if (!eventName) {
        return false;
    }
    this.eventName = eventName;
    return true;
}

const eventInfoSpec = {
    // TODO: expand to conver desired event types
    eventName: cannonicalizeEventName,
    // TODO: what is the real bucket naming spec?
    bucket: bucketNameRe,
    // TODO: make a regexp out of the prefix and cache it
    prefix(v) {
        if (!v) {
            this.prefix = '';
            return true;
        }
        return (typeof v === 'string');
    },
};

const runParamsSpec = {
    eventName: cannonicalizeEventName,
    // TODO: improve field extraction
    request(req) {
        if (req.method === 'PUT' && (!(req instanceof stream.Readable)
        || !(/^[0-9a-f]{32}$/i.test(req.contentMD5)))) {
            return false;
        }
        const errs = validate({
            bucketName: bucketNameRe,
            objectKey: /\w+/,
            headers: {},
            namespace: '',
            parsedHost(ip) {
                return !!net.isIP(ip);
            },
            parsedContentLength: 0,
        }, req);
        if (errs.length) {
            console.log("have errs.length!!", errs)
            return false;
        }
        // setting these here to validate against?
        this.bucket = req.bucketName;
        this.key = req.objectKey;
        this.headers = req.headers;
        this.region = req.namespace;
        this.sourceIPAddress = req.parsedHost;
        this.size = req.parsedContentLength;
        this.etag = req.contentMD5;
        this.contentType = req.headers['content-type'];
        this.metadata = {};
        Object.keys(req.headers).forEach(k => {
            const m = metadataRe.exec(k);
            if (!m) {
                return;
            }
            this.metadata[m[1]] = req.headers[k];
        });
        return true;
    },
    log(v) {
        if (typeof v !== 'object') {
            return false;
        }
        return ['trace', 'info'].every(k => typeof v[k] === 'function');
    },
};

function createKey(eventInfo) {
    return `${eventInfo.eventName}|${eventInfo.bucket}`;
}

const s3ObjectMapping = {
    key(v) {
        if (this.objectKey !== v) {
            this.objectKey = v;
        }
    },
    contentType(v) {
        if (this.headers['content-type'] !== v) {
            this.headers['content-type'] = v;
        }
    },
    metadata(v) {
        Object.keys(v).forEach(k => {
            const tag = k.toLowerCase();
            this.headers[`x-amz-meta-${tag}`] = v[k];
        });
    },
};

function updateEventInfo(event, output) {
    const s3Obj = event.Records[0].s3.object;
    Object.keys(s3ObjectMapping).forEach(k => {
        s3ObjectMapping[k].call(output, s3Obj[k]);
    });
    return output;
}

// TODO: improve field extraction
function makePredicateEvent(runParams, body) {
    return {
        // why an array?
        Records: [{
            eventVersion: '2.0',
            eventSource: 'aws:s3',
            awsRegion: runParams.region,
            eventTime: new Date(),
            eventName: runParams.eventName,
            userIdentity: {
                principalId: runParams.userIdentity.getShortid(),
                principalEmail: runParams.userIdentity.getEmail(),
            },
            requestParameters: {
                sourceIPAddress: runParams.sourceIPAddress,
            },
            responseElements: {
                'x-amz-request-id': runParams.amzRequestId,
                'x-amz-id-2': runParams.amzRequestId2,
            },
            s3: {
                s3SchemaVersion: '1.0',
                configurationId: '00000000-0000-0000-0000-000000000000',
                bucket: {
                    name: runParams.bucket,
                    ownerIdentity: {
                        principalId: runParams.bucketOwnerId,
                    },
                    arn: runParams.bucketArn,
                },
                object: {
                    key: runParams.key,
                    size: runParams.size,
                    eTag: runParams.etag,
                    contentType: runParams.contentType,
                    metadata: runParams.metadata,
                    body,
                    versionId: 'N/A',
                    sequencer: 'N/A',
                },
            },
        }],
    };
}

function tryRequire(p) {
    const out = {};
    try {
        const fnpath = path.resolve(process.cwd(), p);
        const fn = require(fnpath);
        if (typeof fn !== 'function') {
            throw new TypeError('Required object not function');
        }
        out.fn = fn;
    } catch (e) {
        out.err = e;
    }
    return out;
}

function getPredicate(registry, runParams, callback) {
    console.log("getting predicate!!")
    const errs =
    // why runParams as an argument twice?
    // would be clearer to send in an empty array for the errors.
        validate(runParamsSpec, runParams, runParams);
    if (errs.length) {
        return callback('Invalid runParams');
    }
    const key = createKey(runParams);
    console.log("key from runParams!!", key)
    const preds = registry.predicates[key];
    console.log("found preds!!", preds)

    if (!preds) {
        return callback(`No predicate exists for "${key}"`);
    }

    const k = runParams.key;
    const klen = k.length;
    let maxp = -1;
    let fn = null;

    // Linear search - for now we don't anticipate
    // having too many prefixes for the same bucket.
    Object.keys(preds).forEach(p => {
        const plen = p.length;
        if (plen > klen) {
            return;
        }
        if (plen > maxp && k.indexOf(p) === 0) {
            maxp = plen;
            fn = preds[p];
        }
    });

    if (!fn) {
        return callback(`No predicate exists for "${key}"`);
    }
    return callback(null, fn);
}

function runWrapped(event, fn, log, callback) {
    // NOTE: unexpected errors in the predicate will kill
    // the worker process, but short of diving into `vm` or
    // `async_wrap`, I don't see how to handle buggy async user
    // predicate functions without resorting to `domain`.
    // `vm` would be a more robust approach to sandboxing user code,
    // but that's another PR.

    fn(event, err => {
        if (err) {
            const predError = (err instanceof Error) ? err : new Error(err);
            log.trace('operation rejected by user predicate', predError);
            return callback(errors.PreconditionFailed);
        }
        return callback();
    });
}

function runPredicate(runParams, fn, callback) {
    const { request, log } = runParams;
    const reqWrap = new RequestWrapper(request);
    const event = makePredicateEvent(runParams, reqWrap);

    return runWrapped(event, fn, log, err => {
        if (err) {
            return callback(err);
        }
        const output = updateEventInfo(event, reqWrap[OUTPUT_SYM]());
        return callback(null, output);
    });
}

class PredicateRegistry {

    constructor() {
        this.predicates = {};
    }

    /**
     * Add user-supplied predicate to the registry:
     *
     * @param {object} eventInfo - object conforming to eventInfoSpec,
     * @param {function | string} _fn - user-supplied predicate function,
     *                                  or path to same,
     * @param {function | undefined} _callback - called once registration
     *                                          is complete. If no callback
     *                                          is supplies, put throws.
     * @return {undefined}
     */
    put(eventInfo, _fn, _callback) {
        let callback;

        if (typeof _callback === 'function') {
            callback = _callback;
        } else {
            callback = err => {
                if (err) {
                    throw err;
                }
            };
        }
        const errs =
            validate(eventInfoSpec, eventInfo, eventInfo);
        if (errs.length) {
            return callback(new Error(errs.join()));
        }

        let fn;

        if (typeof _fn === 'string') {
            const fnResult = tryRequire(_fn);
            if (fnResult.err) {
                return callback(fnResult.err);
            }
            fn = fnResult.fn;
        } else if (typeof _fn !== 'function') {
            return callback('User-supplied predicate must be either ' +
                'a function or a path to a function');
        } else {
            fn = _fn;
        }

        if (fn.length !== 2) { // TODO: add context to mimic AWS Lambda??
            return callback('User-supplied predicates must take 2 arguments');
        }

        const key = createKey(eventInfo);
        let preds = this.predicates[key];

        if (preds) {
            if (preds[eventInfo.prefix]) {
                return callback('User-supplied predicate already exists ' +
                    `for "${key}", "${eventInfo.prefix}"`);
            }
        } else {
            this.predicates[key] = preds = {};
        }

        preds[eventInfo.prefix] = fn;

        return callback();
    }

    /**
     * Run user-supplied predicate before matching object is stored:
     *
     * @param {object} runParams - object conforming to runParamsSpec,
     * @param {function} callback - called after predicate has processed
     *                              incoming object or in the case of error;
     *                              it is callback's responsibility to store
     *                              the data.
     * @return {undefined}
     */
    run(runParams, callback) {
        // since this will run on every api call, we probably want to just
        // call the callback if the config has no predicates rather than
        // checking all of the time.
        const { log } = runParams;
        getPredicate(this, runParams, (err, fn) => {
            if (err) {
                log.trace('predicate', {
                    message: 'no user-supplied predicate found',
                });
                return callback(null, runParams.request);
            }
            return runPredicate(runParams, fn, (err, output) => {
                callback(err, output);
            });
        });
    }

    purge() {
        this.predicates = {};
    }
}

export default new PredicateRegistry();