const { errors, s3middleware } = require('arsenal');
const MD5Sum = s3middleware.MD5Sum;

const getSubPartInfo = require('./getSubPartInfo');
const putNextSubPart = require('./putNextSubPart');
const SubStreamInterface = require('./SubStreamInterface');
const ResultsCollector = require('./ResultsCollector');

function putSubParts(errorWrapperFn, request, params,
dataStoreName, log, cb, maxSubPartSize) {
    const subPartInfo = getSubPartInfo(params.size);
    const resultsCollector = new ResultsCollector();
    const hashedStream = new MD5Sum();
    const streamInterface = new SubStreamInterface(hashedStream);
    log.trace('data length is greater than max subpart size;' +
        'putting multiple parts');

    resultsCollector.on('error', (err, subPartIndex) => {
        log.error(`Error putting subpart to B2: ${subPartIndex}`,
            { error: err.message, dataStoreName });
        streamInterface.stopStreaming(request);
        if (err.code === 'ContainerNotFound') {
            return cb(errors.NoSuchBucket);
        }
        return cb(errors.InternalError.customizeDescription(
            `Error returned from B2: ${err}`));
    });

    resultsCollector.on('done', (err, results) => {
        if (err) {
            log.error('Error putting last subpart to B2',
                { error: err.message, dataStoreName });
            if (err.code === 'ContainerNotFound') {
                return cb(errors.NoSuchBucket);
            }
            return cb(errors.InternalError.customizeDescription(
                `Error returned from B2: ${err}`));
        }
        const numberSubParts = results.length;
        const totalLength = streamInterface.getTotalBytesStreamed();
        log.trace('successfully put subparts to B2',
            { numberSubParts, totalLength });
        hashedStream.on('hashed', () => cb(null, hashedStream.completedHash,
            numberSubParts, totalLength));

        // in case the hashed event was already emitted before the
        // event handler was registered:
        if (hashedStream.completedHash) {
            hashedStream.removeAllListeners('hashed');
            return cb(null, hashedStream.completedHash, numberSubParts,
                totalLength);
        }
        return undefined;
    });

    const currentStream = streamInterface.getCurrentStream();
    // start first put to B2 before we start streaming the data
    putNextSubPart(errorWrapperFn, params, subPartInfo,
        currentStream, 0, resultsCollector, log, cb);

    request.pipe(hashedStream);
    hashedStream.on('end', () => {
        resultsCollector.enableComplete();
        streamInterface.endStreaming();
    });
    hashedStream.on('data', data => {
        const currentLength = streamInterface.getLengthCounter();
        if (currentLength + data.length > maxSubPartSize) {
            const bytesToMaxSize = maxSubPartSize - currentLength;
            const firstChunk = bytesToMaxSize === 0 ? data :
                data.slice(bytesToMaxSize);
            if (bytesToMaxSize !== 0) {
                // if we have not streamed full subpart, write enough of the
                // data chunk to stream the correct length
                streamInterface.write(data.slice(0, bytesToMaxSize));
            }
            const { nextStream, subPartIndex } =
                streamInterface.transitionToNextStream();
            putNextSubPart(errorWrapperFn, params, subPartInfo,
                nextStream, subPartIndex, resultsCollector, log, cb);
            streamInterface.write(firstChunk);
        } else {
            streamInterface.write(data);
        }
    });
};

module.exports = putSubParts;
