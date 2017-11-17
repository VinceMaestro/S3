const https = require('https');

function async_https_write(options, data)
{
  return new Promise((resolve, reject) => {
    const req = https.request(options, function(res) {
      res.on('data', function (chunk) {
        resolve(JSON.parse(chunk));
      });
    });
    req.on('error', function(err) {
      reject(err);
    });
    if (undefined !== data) {
      req.write(data);
    }
    req.end();
  });
}
module.exports = async_https_write;
