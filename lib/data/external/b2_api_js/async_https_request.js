const https = require('https');

function async_https_request(options)
{
  options['User-Agent'] = 'Zenko';
  return new Promise((resolve, reject) => {
   const req = https.request(options, function(res) {
     resolve(res);
   });
   req.on('error', function (err) {
     reject('problem with request: ' + err.message);
   });
   req.end();
  });
}

module.exports = async_https_request;
