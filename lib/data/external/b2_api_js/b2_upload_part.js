const url = require('url');
const async_https_write = require('./async_https_write');

function upload_part(auth, binaryFileData, sha1, params) {
  var parsed_url = url.parse(auth.uploadUrl);
  const options = {
    host: parsed_url.hostname,
    path: parsed_url.pathname,
    method: 'POST',
    headers: {
      'Authorization': auth.authorizationToken,
      'X-Bz-Part-Number' : params.PartNumber,
      'Content-length': binaryFileData.length,
      'X-Bz-Content-Sha1': sha1
    }
  };
  return async_https_write(options, binaryFileData)
};

module.exports = upload_part;
