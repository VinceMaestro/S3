const https = require('https');
const url = require('url');
const sha1 = require('sha1');
const fs = require('fs');
const get_upload_url = require('./b2_get_upload_url');

const FILE_NAME = '../app.js';

get_upload_url((data) => {

  var binaryFileData = fs.readFileSync(FILE_NAME);
  var params = url.parse(data.uploadUrl);
  binaryFileData = JSON.stringify(binaryFileData);
  var hash = sha1(binaryFileData);

  const options = {
    host: params.hostname,
    path: params.pathname,
    method: 'POST',
    headers: {
      'Authorization': data.authorizationToken,
      'X-Bz-File-Name' : 'app.js', //destination path
      'Content-Type': 'text/plain',
      'Content-length': binaryFileData.length,
      'X-Bz-Content-Sha1': hash
    }
  };

  var req = https.request(options, function(res) {
    res.on('data', function (chunk) {
      console.log(chunk + '');
    });
  });

  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });
  req.write(binaryFileData);
  req.end();
});
