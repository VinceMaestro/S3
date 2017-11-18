var url = require('url');
const authorize_account = require('./b2_authorize_account');
const get_bucket_list = require('./b2_get_bucket_list');
const async = require('async');

async function setAuthAndBucketIdOnce(that) {
  if (that.auth == undefined) {
    that.auth = await authorize_account(that.b2StorageCredentials.accountId,
                      that.b2StorageCredentials.b2ApplicationKey,
                      that.b2StorageEndpoint);
  };
  if (that.bucketId == undefined) {
    that.bucketId = (await get_bucket_list(that.b2StorageCredentials.accountId,
                that.auth.authorizationToken,
                url.parse(that.auth.apiUrl).hostname
    )).buckets.find(bucket => bucket.bucketName == that._b2ContainerName).bucketId;
  };
}

module.exports = setAuthAndBucketIdOnce;
