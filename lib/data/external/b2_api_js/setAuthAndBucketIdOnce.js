var url = require('url');
const authorize_account = require('./b2_authorize_account');
const list_buckets = require('./b2_list_buckets');
const async = require('async');

async function setAuthAndBucketIdOnce(that) {
	if (that.auth == undefined) {
		that.auth = await authorize_account(that.b2StorageCredentials.accountId,
			that.b2StorageCredentials.b2ApplicationKey,
			that.b2StorageEndpoint);
	};
	if (that.bucketId == undefined) {
		that.bucketId = (
			await list_buckets(
				that.b2StorageCredentials.accountId,
				that.auth.authorizationToken,
				url.parse(
					that.auth.apiUrl
				).hostname
		)).buckets.find(
			bucket => bucket.bucketName == that._b2ContainerName
		).bucketId;
	};
}

module.exports = setAuthAndBucketIdOnce;
