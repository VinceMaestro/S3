var https = require('https');

var accountId = '8a8aedc53a53';
var applicationKey = '001c4759599a5c362f030b88187a1e667b57663cad';
var host = 'api.backblazeb2.com';

function authorize_account(accountId, applicationKey, host) {
  const options = {
    host: host,
    path: '/b2api/v1/b2_authorize_account',
    auth: accountId + ':' + applicationKey
  };
  return new Promise((resolve, reject) => {
    var req = https.request(options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        var data = JSON.parse(chunk);
        var authorizationToken = data.authorizationToken;
        resolve(authorizationToken);
      });
    });
    req.on('error', function(e) {
      reject('problem with request\n: ' + e.message);
    });
    req.end();
  });
};

module.exports = authorize_account;

// authorize_account(accountId, applicationKey, host);
