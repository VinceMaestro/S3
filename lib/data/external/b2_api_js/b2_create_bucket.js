var ACCOUNT_ID = '8a8aedc53a53';
var BUCKET_NAME = 'bucketb2';
var BUCKET_TYPE = 'allPrivate';
var TOKEN = '3_20171106160113_fbc14b8d7cdf2cfccc65b871_295dee20a6b56e598fd885e61c8085ade4559c4a_001_acct';
var API_URL = 'api001.backblazeb2.com';


const url = require('url');
const async_https_request = require('./async_https_request');

function b2_create_bucket(auth, accountId, bucketName, bucketType) {
  const host = url.parse(auth.apiUrl).hostname;
  const postData = JSON.stringify({
		'accountId': accountId,
		'bucketName': bucketName,
		'bucketType': bucketType
  });
  const options = {
    host: host,
    path: '/b2api/v1/b2_create_bucket',
    method: 'POST',
    headers: {
      'Authorization': auth.authorizationToken,
			'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    }
  };
  return async_https_request(options, postData, false)
};

module.exports = b2_create_bucket;
