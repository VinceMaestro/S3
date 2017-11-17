const { errors, s3middleware } = require('arsenal');
const async = require('async');
const createLogger = require('../multipleBackendLogger');
const { logHelper } = require('./utils');
const { config } = require('../../Config');
const { validateAndFilterMpuParts } =
    require('../../api/apiUtils/object/processMpuParts');
const constants = require('../../../constants');
const metadata = require('../../metadata/wrapper');
const delete_file_version = require('./b2_api_js/b2_delete_file_version');
const get_upload_url = require('./b2_api_js/b2_get_upload_url');
const get_upload_part_url = require('./b2_api_js/b2_get_upload_part_url');
const upload_file = require('./b2_api_js/b2_upload_file');
const upload_part = require('./b2_api_js/b2_upload_part');
const MD5Sum = s3middleware.MD5Sum;
const download_file = require('./b2_api_js/b2_download_file');
const get_bucket_id = require('./b2_api_js/b2_get_bucket_id');
const async_https_write = require('./b2_api_js/async_https_write');
const sha1 = require('sha1');
const url = require('url');
const { prepareStream } = require('../../api/apiUtils/object/prepareStream');
const verifyIfAuthAndBucketIdIsOk = require('./b2_api_js/verifyIfAuthAndBucketIdIsOk');
const md5 = require('md5');

class B2Client {
/*
  TODO
  penser a detruire la variable this.uploadUrl apres avoir finis lupload dun file avec b2_finish_large_file
*/

//creer une fonction pour checker authorize_account et get_bucket_id

    constructor(config) {
        this.b2StorageEndpoint = config.b2StorageEndpoint;
        this.b2StorageCredentials = config.b2StorageCredentials;
        this._b2ContainerName = config.b2ContainerName;
        this._dataStoreName = config.dataStoreName;
        this._bucketMatch = config.bucketMatch;
        verifyIfAuthAndBucketIdIsOk(this);
    }

    uploadPart(request, streamingV4Params, stream, size, key, uploadId,
    partNumber, bucketName, log, callback) {
      verifyIfAuthAndBucketIdIsOk(this);
      console.log('\nuploadpart B2\n')
      let hashedStream = stream;
      if (request) {
        const partStream = prepareStream(request, streamingV4Params,
          log, callback);
          hashedStream = new MD5Sum();
          partStream.pipe(hashedStream);
      }
      const params = { Key: key, UploadId: uploadId,
        Body: hashedStream, ContentLength: size,
        PartNumber: partNumber
      };
      Promise.all([this._leech(hashedStream),
      get_upload_part_url(this.auth, uploadId)]).then(result => {
        var sha1_bin = sha1(result[0]); // mettre en callback
        upload_part(result[1], result[0], sha1_bin, params).then(result => {
          var partInfo = {
            'Key': key,
            'dataStoreType': 'b2',
            'dataStoreName': this._dataStoreName,
            'dataStoreETag': hashedStream.completedHash
          }
          return callback(null, partInfo);
      }).catch(err => {
          console.log(err);
          return callback(err);
        });
      });
}
    // createMultipartUpload is an alis of b2_start_large_file see https://www.backblaze.com/b2/docs/b2_start_large_file.html
    createMultipartUpload (auth, data, callback) {
      const host = url.parse(auth.apiUrl).hostname;
      const postData = JSON.stringify({
        'bucketId': data.bucketId,
        'fileName': data.fileName,
        'contentType': 'b2/x-auto'
      });
      const options = {
        host: host,
        path: '/b2api/v1/b2_start_large_file',
        method: 'POST',
        headers: {
          'Authorization': auth.authorizationToken,
          'Content-Length': postData.length,
        }
      };
      return async_https_write(options, postData).then(result => {
        var ret = {
          'Bucket': result.bucketId,
          'Key': data.fileName,
          'UploadId': result.fileId
        }
        callback(null, ret);
      });
    };

    createMPU(Key, metaHeaders, bucketName, websiteRedirectHeader, log,
    callback) {
      verifyIfAuthAndBucketIdIsOk(this);
        const awsBucket = this.b2ContainerName;
        var data = {
          fileName: Key,
          bucketId: this.bucketId
        }

        return this.createMultipartUpload(this.auth, data, (err, mpuResObj) => {
            if (err) {
                logHelper(log, 'error', 'err from data backend',
                  err, this._dataStoreName);
                return callback(errors.ServiceUnavailable
                  .customizeDescription('Error returned from ' +
                  `AWS: ${err.message}`)
                );
            }
            return callback(null, mpuResObj);
        })};

    _leech(stream) {
      return new Promise((resolve, reject) => {
        var body = [];
        stream.on('data', (chunk) => {
          body.push(chunk);
        }).on('end', () => {
          body = Buffer.concat(body);
          resolve(body);
        }).on('error', err => {
          reject('Error while reading the stream: ' + err);
        })
      });
    }

    put(stream, size, keyContext, reqUids, callback) {
// console.log(Date.now() / 1000)
      verifyIfAuthAndBucketIdIsOk(this);
      Promise.all([this._leech(stream),
        get_upload_url(this.auth, this.bucketId)]).then(result => {
// console.log(Date.now() / 1000)
          upload_file(result[1], result[0], keyContext).then(result => {
// console.log(Date.now() / 1000)
            callback(null, keyContext.objectKey, result.fileId);
        });
    });
    }

    async get(objectGetInfo, range, reqUids, callback) {
      verifyIfAuthAndBucketIdIsOk(this);
      const log = createLogger(reqUids);
      const { key, dataStoreVersionId } = objectGetInfo;
      var stream = null;
      download_file(this.auth, dataStoreVersionId).then(result => {
        stream = result;
      });
      console.log('Download file complete');
      callback(null, stream);
    }

    async delete(objectGetInfo, reqUids, callback) {
      verifyIfAuthAndBucketIdIsOk(this);
      let res = await delete_file_version(this.auth,
        this.b2StorageEndpoint,
        objectGetInfo.key,
        objectGetInfo.dataStoreVersionId);
			console.log('Delete file complete');
      return callback();
    }

}

module.exports = B2Client;
