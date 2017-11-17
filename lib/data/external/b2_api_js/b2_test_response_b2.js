const authorize_account = require('./b2_authorize_account');
const get_upload_url = require('./b2_get_upload_url');
const upload_file = require('./b2_upload_file');
const fs = require('fs');
const stream = require('stream')


var data = fs.readFileSync('/Users/jjourdai/check_list_rendu.txt');
// var data = fs.createReadStream('/Users/jjourdai/check_list_rendu.txt');

const ACCOUNT_ID = '8a8aedc53a53'
const APP_KEY = '001186e6b621d52fa647f3f6c364c648c874a9288d'
const HOST = 'api.backblazeb2.com'
const BUCKET_ID = '182a383a3eddbc5553fa0513'

var keyContext =  {
  objectKey: 'check_list_rendu.txt'
}


authorize_account(ACCOUNT_ID, APP_KEY, HOST).then(result => {
  console.log(Date.now() / 1000);
  get_upload_url(result, BUCKET_ID).then(result => {
    console.log(Date.now() / 1000);
    upload_file(result, data, keyContext).then(result => {
      console.log(Date.now() / 1000);
    })
  });
});
