var https = require('https');
var url = require('url');
const authorize_account = require('./b2_authorize_account');
const get_bucket_id = require('./b2_get_bucket_id');


async function verifyIfAuthAndBucketIdIsOk(self) {
  if (self.auth == undefined) {
    self.auth = await authorize_account(self.b2StorageCredentials.accountId,
                      self.b2StorageCredentials.b2ApplicationKey,
                      self.b2StorageEndpoint)};
  if (self.bucketId == undefined) {
    self.bucketId = await get_bucket_id(self.b2StorageCredentials.accountId,
                self.auth.authorizationToken,
                url.parse(self.auth.apiUrl).hostname)};
}

module.exports = verifyIfAuthAndBucketIdIsOk;
