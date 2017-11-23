const url = require('url');
const async_https_request = require('./async_https_request');

function upload_part(auth, binaryFileData, sha1, params) {
  var parsed_url = url.parse(auth.uploadUrl);
  const options = {
    host: parsed_url.hostname,
    path: parsed_url.pathname,
    method: 'POST',
    headers: {
		// 'X-Bz-Test-Mode': 'force_cap_exceeded',
    // 'X-Bz-Test-Mode': 'fail_some_uploads',
    // 'X-Bz-Test-Mode': 'expire_some_account_authorization_tokens',
      'Authorization': auth.authorizationToken,
      'X-Bz-Part-Number' : params.PartNumber,
      'Content-length': binaryFileData.length,
      'X-Bz-Content-Sha1': sha1
    }
  };
  return async_https_request(options, binaryFileData, false)
};

module.exports = upload_part;
