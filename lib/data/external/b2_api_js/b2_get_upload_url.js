const url = require('url');
const async_https_request = require('./async_https_request');

function get_upload_url(data, bucketId) {
	console.log('get_upload_url');
	const host = url.parse(data.apiUrl).hostname;
	const postData = JSON.stringify({
		'bucketId': bucketId,
	});
	const options = {
		host: host,
		path: '/b2api/v1/b2_get_upload_url',
		method: 'POST',
		headers: {
			'Authorization': data.authorizationToken,
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': postData.length
		}
	};
	console.log('get_upload_url -> async_https_request');
	return async_https_request(options, postData, false);
};

module.exports = get_upload_url;
