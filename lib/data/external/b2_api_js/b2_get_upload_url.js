const url = require('url');
const async_https_write = require('./async_https_write');

const BUCKET_ID = 'a8ea682acefd9c0553fa0513';

function get_upload_url(data, bucketId = BUCKET_ID) {
  const postData = JSON.stringify({
    'bucketId': bucketId,
  });
  const options = {
    host: url.parse(data.apiUrl).hostname,
    path: '/b2api/v1/b2_get_upload_url',
    method: 'POST',
    headers: {
      'Authorization': data.authorizationToken,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    }
  };
  return async_https_write(options, postData);
};

module.exports = get_upload_url;
