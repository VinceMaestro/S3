var https = require('https');

function authorize_account(accountId, applicationKey, host, ) {
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
        resolve(data);
      });
    });
    req.on('error', function(e) {
      reject('problem with request\n: ' + e.message);
    });
    req.end();
  });
};

module.exports = authorize_account;
