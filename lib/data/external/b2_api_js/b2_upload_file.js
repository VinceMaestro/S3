const url = require('url');
const sha1 = require('sha1');
const async_https_write = require('./async_https_write');

function upload_file(auth, binaryFileData, keyContext) {
  var params = url.parse(auth.uploadUrl);
  const options = {
    host: params.hostname,
    path: params.pathname,
    method: 'POST',
    headers: {
      'Authorization': auth.authorizationToken,
      'X-Bz-File-Name' : keyContext.objectKey,
      'Content-Type': 'text/plain',
      'Content-length': binaryFileData.length,
      'X-Bz-Content-Sha1': sha1(binaryFileData)
    }
  };
  return async_https_write(options, binaryFileData)
};

module.exports = upload_file;
