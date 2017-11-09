const url = require('url');
const async_https_write = require('./async_https_write');
const async_https_request = require('./async_https_request');
// const https = require('https');

function download_file(auth, fileId) {
  var params = url.parse(auth.apiUrl);
  const options = {
    host: params.hostname,
    path: '/b2api/v1/b2_download_file_by_id?fileId=' + fileId,
    method: 'GET',
    headers: {
      'Authorization': auth.authorizationToken,
    }
  };
  return async_https_request(options);
}

module.exports = download_file;
