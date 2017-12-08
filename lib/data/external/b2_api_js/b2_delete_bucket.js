const url = require('url');
const async_https_request = require('./async_https_request');

function delete_bucket(auth, accountId, bucketId) {
	const params = url.parse(auth.apiUrl);
	const postData = JSON.stringify({
		'accountId': accountId,
		'bucketId': bucketId
	});
	const options = {
		host: params.hostname,
		path: '/b2api/v1/b2_delete_bucket',
		method: 'POST',
		headers: {
			'Authorization': auth.authorizationToken,
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': postData.length
		}
	};
	return async_https_request(options, postData, false);
};

module.exports = delete_bucket;
