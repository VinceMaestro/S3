var https = require('https');
const async = require('async');
const async_https_write = require('./async_https_write');

async function b2_get_bucket_id(accountId, token, host) {
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
  const listBucket = await async_https_write(options, postData);
  return listBucket.buckets[0].bucketId;
}

module.exports = b2_get_bucket_id;
