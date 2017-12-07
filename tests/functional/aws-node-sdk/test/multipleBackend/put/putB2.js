const assert = require('assert');

const BucketUtility = require('../../../lib/utility/bucket-util');
const withV4 = require('../../support/withV4');

const {
    describeSkipIfNotMultiple,
    getB2Keys,
    b2Location,
} = require('../utils');

const keys = getB2Keys();

const b2Timeout = 10000;

describeSkipIfNotMultiple('Multiple backend PUT object from B2',
function testSuite() {
	this.timeout(30000);
	withV4(sigCfg => {
	    let bucketUtil;
	    let s3;

	    before(() => {
	        process.stdout.write('Creating bucket\n');
	        bucketUtil = new BucketUtility('default', sigCfg);
	        s3 = bucketUtil.s3;
	        return s3.createBucketAsync({ Bucket: b2Location })
	        .catch(err => {
	            process.stdout.write(`Error creating bucket: ${err}\n`);
	            throw err;
	        });
	    });

	    after(() => {
	        process.stdout.write('Emptying bucket\n');
	        return bucketUtil.empty(b2Location)
	        .then(() => {
	            process.stdout.write('Deleting bucket\n');
	            return bucketUtil.deleteOne(b2Location);
	        })
	        .catch(err => {
	            process.stdout.write('Error emptying/deleting bucket: ' +
	            `${err}\n`);
	            throw err;
	        });
	    });
		keys.forEach(key => {
		    describe(`${key.describe} size`, () => {
				const testKey = `${key.name}-${Date.now()}`;

                it('should return code 404 when testing GET on non existing file', done => {
					s3.getObject({ Bucket: b2Location, Key: testKey }, (err, res) => {
						assert.notEqual(err, null, 'Expected error but got success, this file seems to exist already, please run test again');
						assert.equal(err.statusCode, 404, `Expected error 404 but got error ${err.statusCode}`);
						done();
					});
				});
				it('should return no error when testing PUT with valid params', done => {
                    s3.putObject({
                        Bucket: b2Location,
                        Key: testKey,
                        Body: key.body,
                        Metadata: { 'scal-location-constraint': b2Location }
                    }, (err, res) => {
						assert.equal(err, null, `Expected success but got error ${err}`);
						done();
                    });
                });
				it('should return no error && same MD5 when testing GET with valid params', done => {
					s3.getObject({ Bucket: b2Location, Key: testKey }, (err, res) => {
						assert.equal(err, null, `Expected success but got error ${err}`);
						assert.strictEqual(res.ETag, `"${key.MD5}"`, `Expected identical MD5 : got ${res.ETag} , expected: ${key.MD5}`);
						done();
					});
				});
				it('should return code 400 when testing PUT with fake location', done => {
					let tmpLoc = 'PleaseDontCreateALocationWithThisNameOrThisTestWillFail-' + Date.now()
                    s3.putObject({
                        Bucket: tmpLoc,
                        Key: testKey,
                        Body: key.body,
                        Metadata: { 'scal-location-constraint': tmpLoc }
                    }, (err, res) => {
						assert.notEqual(err, null, 'Expected error but got success, this location seems to exist already, please run test again');
						assert.equal(err.statusCode, 400, `Expected error 400 but got error ${err.statusCode}`);
						done();
                    });
                });
			})
		})
	})
})
