const url = require('url');
const async_https_request = require('./async_https_request');

function upload_part(auth, stream, partNumber, size) {
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
      'X-Bz-Part-Number' : partNumber,
      'Content-length': size,
      'X-Bz-Content-Sha1': 'hex_digits_at_end'
    }
  };
  return async_https_request(options, stream, false)
};

module.exports = upload_part;
