const url = require('url');
const sha1 = require('sha1');
const async_https_request = require('./async_https_request');

function upload_file(auth, binaryFileData, fileName, size) {
	console.log('upload_file');
	const options = {
		host: url.parse(auth.uploadUrl).hostname,
		path: url.parse(auth.uploadUrl).pathname,
		method: 'POST',
		headers: {
			'Authorization': auth.authorizationToken,
			'X-Bz-File-Name' : fileName,
			'Content-Type': 'text/plain',
			'Content-length': size,
			'X-Bz-Content-Sha1': 'hex_digits_at_end'
		}
	};
	console.log('upload_file -> async_https_request');
	return async_https_request(options, binaryFileData, false);
};

module.exports = upload_file;
