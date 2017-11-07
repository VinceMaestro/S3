var https = require('https');

var ACCOUNT_ID = '8a8aedc53a53';
var BUCKET_NAME = 'newBucketCAMARCHEPAS2';
var TOKEN = '3_20171106160113_fbc14b8d7cdf2cfccc65b871_295dee20a6b56e598fd885e61c8085ade4559c4a_001_acct';
var API_URL = 'api001.backblazeb2.com';

const postData = JSON.stringify({
  'accountId': ACCOUNT_ID,
});

const options = {
  host: API_URL,
  path: '/b2api/v1/b2_list_buckets',
  method: 'POST',
  headers: {
    'Authorization': TOKEN,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': postData.length
  }
};


var req = https.request(options, function(res) {
  // console.log('STATUS: ' + res.statusCode);
  // console.log('HEADERS: ' + JSON.stringify(res.headers));
  res.setEncoding('utf8');
  res.on('data', function (chunk) {
    console.log(chunk);
  });
});

/*
{
  "buckets": [
    {
      "accountId": "8a8aedc53a53",
      "bucketId": "a8ea682acefd9c0553fa0513",
      "bucketInfo": {},
      "bucketName": "bucketb2",
      "bucketType": "allPrivate",
      "corsRules": [],
      "lifecycleRules": [],
      "revision": 1
    },
    {
      "accountId": "8a8aedc53a53",
      "bucketId": "287aa8ba1e2d9c2553fa0513",
      "bucketInfo": {},
      "bucketName": "newBucketCAMARCHEPAS",
      "bucketType": "allPrivate",
      "corsRules": [],
      "lifecycleRules": [],
      "revision": 1
    }
  ]
}
*/

req.on('error', function(e) {
  console.log('problem with request: ' + e.message);
});

req.write(postData);
req.end();
