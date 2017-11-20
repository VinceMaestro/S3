const url = require('url');
const sha1 = require('sha1');
const async_https_request = require('./async_https_request');

function upload_file(auth, binaryFileData, keyContext) {
	console.log('upload_file');
	const options = {
		host: url.parse(auth.uploadUrl).hostname,
		path: url.parse(auth.uploadUrl).pathname,
		method: 'POST',
		headers: {
			'Authorization': auth.authorizationToken,
			'X-Bz-File-Name' : keyContext.objectKey,
			'Content-Type': 'text/plain',
			'Content-length': binaryFileData.length,
			'X-Bz-Content-Sha1': sha1(binaryFileData)
		}
	};
	console.log('upload_file -> async_https_request');
	return async_https_request(options, binaryFileData, true);
};

module.exports = upload_file;
