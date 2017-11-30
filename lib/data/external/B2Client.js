// External imports
const { errors, s3middleware } = require('arsenal');
const async = require('async');
const sha1 = require('sha1');
const url = require('url');
const MD5Sum = s3middleware.MD5Sum;

// path = /
const constants = require('../../../constants');

// path = /lib/
const metadata = require('../../metadata/wrapper');
const { config } = require('../../Config');
const { prepareStream } = require('../../api/apiUtils/object/prepareStream');
const { validateAndFilterMpuParts } =
	require('../../api/apiUtils/object/processMpuParts');

// path = /lib/data/
const createLogger = require('../multipleBackendLogger');

// path = /lib/data/external/
const { logHelper } = require('./utils');

// path = /lib/data/external/b2_api_js/
const delete_file_version = require('./b2_api_js/b2_delete_file_version');
const get_upload_url = require('./b2_api_js/b2_get_upload_url');
const get_upload_part_url = require('./b2_api_js/b2_get_upload_part_url');
const upload_file = require('./b2_api_js/b2_upload_file');
const upload_part = require('./b2_api_js/b2_upload_part');
const list_parts = require('./b2_api_js/b2_list_parts');
const SHA1Sum = require('./b2_api_js/b2_sha1sum');
const download_file = require('./b2_api_js/b2_download_file');
const async_https_request = require('./b2_api_js/async_https_request');
const setAuthAndBucketIdOnce = require('./b2_api_js/setAuthAndBucketIdOnce');
const create_multipart_upload = require('./b2_api_js/b2_create_multipart_upload');
const finish_large_file = require('./b2_api_js/b2_finish_large_file');
const cancel_large_file = require('./b2_api_js/b2_cancel_large_file');

class B2Client {
/*
  TODO
  penser a detruire la variable this.uploadUrl apres avoir finis lupload dun file avec b2_finish_large_file
*/

//creer une fonction pour checker authorize_account et get_bucket_id

	_leech(stream) {
		console.log('     : PUT : _leech');
		return new Promise((resolve, reject) => {
			var body = [];
			stream.on('data', (chunk) => {
				body.push(chunk);
			}).on('end', () => {
				body = Buffer.concat(body);
				resolve(body);
			}).on('error', err => {
				reject(err);
			})
		});
	}

	async 	completeMPU(jsonList, mdInfo, key, uploadId, bucketName, log, callback) {
		let err = null;
		let completeObjData = {};
		let mpuError = {};
		try {
			await setAuthAndBucketIdOnce(this);
			const b2Bucket = this.b2ContainerName;
			const Key = key;
			mpuError = {
					InvalidPart: true,
					InvalidPartOrder: true,
					EntityTooSmall: true,
			};
			const partArray = [];
			const partList = jsonList.Part;
			partList.forEach(partObj => {
					let etag = partObj.ETag[0].substring(1, partObj.ETag[0].length - 1);
					partArray.push(etag);
			});
			completeObjData = { key: Key };
			console.log(partArray)
			let completeMpuRes = await finish_large_file(this.auth, uploadId, partArray);
			// let completeMpuRes = await finish_large_file(this.auth, uploadId, this.sha1[uploadId]);
				// if (!completeMpuRes.VersionId) {
				//     logHelper(log, 'error', 'missing version id for data ' +
				//     'backend object', missingVerIdInternalError,
				//         this._dataStoreName);
				//     return callback(missingVerIdInternalError);
				// }
				// need to get content length of new object to store
				// in our metadata
				// return this._client.headObject({ Bucket: b2Bucket, Key: key },
				// (err, objHeaders) => {
				//     if (err) {
				//         logHelper(log, 'trace', 'err from data backend on ' +
				//         'headObject', err, this._dataStoreName);
				//         return callback(errors.ServiceUnavailable
				//           .customizeDescription('Error returned from ' +
				//           `B2: ${err.message}`)
				//         );
				//     }
						// remove quotes from eTag because they're added later
				completeObjData.key = completeMpuRes.fileName;
				completeObjData.eTag = completeMpuRes.fileId;
				completeObjData.dataStoreVersionId = completeMpuRes.fileId;
				completeObjData.contentLength = completeMpuRes.contentLength;
				console.log(completeObjData);
			} catch (e) {
				console.log(e);
				err = e;
			} finally {
				return callback(err, completeObjData);
			}
		}

	constructor(config) {
		this.b2StorageEndpoint = config.b2StorageEndpoint;
		this.b2StorageCredentials = config.b2StorageCredentials;
		this._b2ContainerName = config.b2ContainerName;
		this._dataStoreName = config.dataStoreName;
		this._bucketMatch = config.bucketMatch;
		this.sha1 = {}; //zenko store md5hash but b2 work with sha1, this var
		//will be use to store the sha1hash of each part, then be send to
		//complete upload
		setAuthAndBucketIdOnce(this).catch(err => console.log(err));
	}

	addNewsha1Part(uploadId, sha1part) {
			if (this.sha1[uploadId] === undefined) {
				this.sha1[uploadId] = [];
			}
			this.sha1[uploadId].push(sha1part);
			// console.log(this.sha1.uploadId);
	}

	async uploadPart(request, streamingV4Params, stream, size, key, uploadId,
		partNumber, bucketName, log, callback)
	{
		console.log('Call : uploadPart');
		let err = null;
		let result = null;
		let sha1Stream = {};
		try {
			await setAuthAndBucketIdOnce(this);
			let hashedStream = stream;
			if (request) {
				const partStream = prepareStream(
					request, streamingV4Params, log, callback);
				hashedStream = new MD5Sum();
				partStream.pipe(hashedStream);
				sha1Stream = new SHA1Sum();
				hashedStream.pipe(sha1Stream);
			}
			result = await get_upload_part_url(this.auth, uploadId)
			await upload_part(result, sha1Stream, partNumber, size + 40);
			result = {
				'Key': key,
				'dataStoreType': 'b2',
				'dataStoreName': this._dataStoreName,
				'dataStoreETag': sha1Stream.completedHash
				// 'dataStoreETag': hashedStream.completedHash
			}
		} catch (e) {
			console.log(e)
			err = e;
		} finally {
			if (!err)
				this.addNewsha1Part(uploadId, sha1Stream.completedHash);
			// console.log(result)
			callback(err, result);
		}
	}

	async listParts(key, uploadId, bucketName, partNumberMarker,
		maxParts, log, callback)
	{
		let storedParts = {};
		let err = null;
		try {
			await setAuthAndBucketIdOnce(this);
			console.log('\nlistparts B2\n')
			// Add 1 to partNumberMarker : b2 start counting at 1 not 0
			let result = await list_parts(
				this.auth,
				uploadId,
				partNumberMarker + 1,
				maxParts
			);
			// build storedParts object to mimic Scality S3 backend returns
			storedParts.Contents = result.parts.map(item => {
				return {
					partNumber: item.partNumber,
					value: {
						Size: item.contentLength,
						ETag: item.contentSha1,
						LastModified: item.uploadTimestamp,
					},
				};
			});
		} catch (e) {
			err = e;
		} finally {
			callback(err, storedParts);
		}
  }

	async createMPU(Key, metaHeaders, bucketName,
		websiteRedirectHeader, log, callback)
		{
		let err = null;
		let mpuResObj = {};
		try {
			console.log('Call : createMPU');
			await setAuthAndBucketIdOnce(this);
			let data = {
				fileName: Key,
				bucketId: this.bucketId
			}
			let result = await create_multipart_upload(this.auth, data)
			mpuResObj = {
				'Bucket': result.bucketId,
				'Key': data.fileName,
				'UploadId': result.fileId
			}
		} catch (e) {
			err = e;
		} finally {
			return callback(err, mpuResObj);
		}
	};

	async abortMPU(key, uploadId, bucketName, log, callback) {
		let err = null;
		let result = null;
		try {
			await setAuthAndBucketIdOnce(this);
			console.log('cancel_large_file upload');
			result = await cancel_large_file(this.auth, uploadId);
		} catch (e) {
			err = e;
		} finally {
			return callback(err, result);
		}
	};

	async put(stream, size, keyContext, reqUids, callback) {
		console.log('Call : PUT');
		let err = null;
		let final_result = [];
		try {
			await setAuthAndBucketIdOnce(this);
			let result = await get_upload_url(this.auth, this.bucketId);
			console.log('     : PUT : IN PROMISE');
			let fileName = keyContext.objectKey;
			let hashedStream = new SHA1Sum();
			stream.pipe(hashedStream);
			// When sending the SHA1 checksum at the end,
			// size should size of the file plus the 40 bytes of hex checksum.
			result = await upload_file(result, hashedStream, fileName, size + 40)
			console.log('     : PUT : DONE');
			final_result = [fileName, result.fileId];
		} catch (e) {
			err = e;
			console.log(e)
		} finally {
			callback(err, final_result[0], final_result[1]);
		}
	}

	async get(objectGetInfo, range, reqUids, callback) {
		console.log('CALL : GET');
		let err = null;
		let result = null;
		try {
			await setAuthAndBucketIdOnce(this);
			const { key, dataStoreVersionId } = objectGetInfo;
			result = await download_file(this.auth, dataStoreVersionId);
		} catch (e) {
			err = e;
		} finally {
			callback(err, result);
		}
	}

	async delete(objectGetInfo, reqUids, callback) {
		let err = null;
        let result = null;
		try {
			console.log('CALL : DELETE');
			await setAuthAndBucketIdOnce(this);
			result = await delete_file_version(
				this.auth,
				this.b2StorageEndpoint,
				objectGetInfo.key,
				objectGetInfo.dataStoreVersionId
			);
			console.log('     : DELETE : DONE');
		} catch (e) {
			err = e;
		} finally {
			callback(err, result);
		}
	}
}

module.exports = B2Client;
