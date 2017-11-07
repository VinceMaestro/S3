var https = require('https');

var BUCKET_ID = 'a8ea682acefd9c0553fa0513';
var TOKEN = '3_20171106160113_fbc14b8d7cdf2cfccc65b871_295dee20a6b56e598fd885e61c8085ade4559c4a_001_acct';
var API_URL = 'api001.backblazeb2.com';

function get_upload_url(callback, bucketId = BUCKET_ID, token = TOKEN, apiUrl = API_URL) {
  const postData = JSON.stringify({
    'bucketId': bucketId,
  });

  const options = {
    host: apiUrl,
    path: '/b2api/v1/b2_get_upload_url',
    method: 'POST',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    }
  };

  var req = https.request(options, function(res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      var json = JSON.parse(chunk);
      var data = {
        uploadUrl: json.uploadUrl,
        authorizationToken: json.authorizationToken
      }
      // console.log(chunk);
      callback(data);
      // console.log(data.uploadUrl);
      // console.log(chunk);
    });
  });

  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });

  req.write(postData);
  req.end();
};

module.exports = get_upload_url;
