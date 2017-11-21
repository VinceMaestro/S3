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
const async_https_request = require('./b2_api_js/async_https_request');
const sha1 = require('sha1');
const url = require('url');
const { prepareStream } = require('../../api/apiUtils/object/prepareStream');
const setAuthAndBucketIdOnce = require('./b2_api_js/setAuthAndBucketIdOnce');
const create_multipart_upload = require('./b2_api_js/b2_create_multipart_upload');
const finish_large_file = require('./b2_api_js/b2_finish_large_file');


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

	completeMPU(jsonList, mdInfo, key, uploadId, bucketName, log, callback) {
		const b2Bucket = this.b2ContainerName;
		const Key = key;
		const mpuError = {
				InvalidPart: true,
				InvalidPartOrder: true,
				EntityTooSmall: true,
		};
		const partArray = [];
		const partList = jsonList.Part;
		partList.forEach(partObj => {
				const partParams = { PartNumber: partObj.PartNumber[0],
						ETag: partObj.ETag[0] };
				partArray.push(partParams);
		});
		const completeObjData = { key: Key };
		finish_large_file(this.auth, uploadId, this.sha1[uploadId]).then(completeMpuRes => {
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
					return callback(null, completeObjData);
			// });
		}).catch(err => {
			if (mpuError[err.code]) {
					logHelper(log, 'trace', 'err from data backend on ' +
					'completeMPU', err, this._dataStoreName);
					return callback(errors[err.code]);
			}
			logHelper(log, 'error', 'err from data backend on ' +
			'completeMPU', err, this._dataStoreName);
			return callback(errors.ServiceUnavailable
				.customizeDescription('Error returned from ' +
				`AWS: ${err.message}`)
			);
		});
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
		try {
			await setAuthAndBucketIdOnce(this);
			console.log('\nuploadpart B2\n')
			let hashedStream = stream;
			if (request) {
				const partStream = prepareStream(
					request, streamingV4Params, log, callback);
				hashedStream = new MD5Sum();
				partStream.pipe(hashedStream);
			}
			const params = {
				Key: key,
				UploadId: uploadId,
				Body: hashedStream,
				ContentLength: size,
				PartNumber: partNumber
			};
			result = await Promise.all([
				this._leech(hashedStream),
				get_upload_part_url(this.auth, uploadId)
			]);
			var sha1_bin = sha1(result[0]); // mettre en callback
			this.addNewsha1Part(uploadId, sha1_bin);
			await upload_part(result[1], result[0], sha1_bin, params);
			result = {
				'Key': key,
				'dataStoreType': 'b2',
				'dataStoreName': this._dataStoreName,
				'dataStoreETag': hashedStream.completedHash
			}
		} catch (e) {
			err = e;
		} finally {
			console.log(result)
			callback(err, result);
		}
	}

	async createMPU(Key, metaHeaders, bucketName,
		websiteRedirectHeader, log, callback)
		{
		console.log('Call : createMPU');
		await setAuthAndBucketIdOnce(this);
		const awsBucket = this.b2ContainerName;
		var data = {
			fileName: Key,
			bucketId: this.bucketId
		}
		create_multipart_upload(this.auth, data
		).then(
			result => {
				var mpuResObj = {
					'Bucket': result.bucketId,
					'Key': data.fileName,
					'UploadId': result.fileId
				}
				return callback(null, mpuResObj);
			},
			err => callback(err)
		);
	};

	async put(stream, size, keyContext, reqUids, callback) {
		console.log('Call : PUT');
		let err = null;
		let final_result = [];
		// console.log(Date.now() / 1000)
		try {
			await setAuthAndBucketIdOnce(this);
			let result = await Promise.all([
				this._leech(stream),
				get_upload_url(this.auth, this.bucketId)
			]);
			console.log(result);
			console.log('     : PUT : IN PROMISE');
			// console.log(Date.now() / 1000)
			result = await upload_file(result[1], result[0], keyContext)
			// console.log(Date.now() / 1000)
			console.log('     : PUT : DONE');
			final_result = [keyContext.objectKey, result.fileId];
		} catch (e) {
			err = e;
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
