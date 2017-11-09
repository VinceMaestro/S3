const https = require('https');
const url = require('url');
const async_https_write = require('./async_https_write');

function delete_file_version(auth, host, fileName, fileId) {
  data = JSON.stringify({
    fileName:fileName,
    fileId:fileId
  });
  var params = url.parse(auth.apiUrl);
  console.log(auth);
  console.log(host);
  const options = {
    host: params.hostname,
    path: '/b2api/v1/b2_delete_file_version',
    method: 'POST',
    headers: {
      'Content-Length': data.length,
      'Authorization': auth.authorizationToken,
    }
  };
  return async_https_write(options, data);
};

module.exports = delete_file_version;
