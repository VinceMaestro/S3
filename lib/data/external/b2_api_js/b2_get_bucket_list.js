var https = require('https');
const async_https_request = require('./async_https_request');

function b2_get_bucket_list(accountId, token, host, b2ContainerName) {
	const postData = JSON.stringify({
		'accountId': accountId,
	});
	const options = {
		host: host,
		path: '/b2api/v1/b2_list_buckets',
		method: 'POST',
		headers: {
			'Authorization': token,
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': postData.length
		}
	};
	return async_https_request(options, postData, true);
}

module.exports = b2_get_bucket_list;
