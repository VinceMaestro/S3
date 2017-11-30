const stream = require('stream');
const { s3middleware } = require('arsenal');
const objectUtils = s3middleware.objectUtils;

const getBlockId = require('./getBlockId');

function putSinglePart(errorWrapperFn, request, params, dataStoreName, log, cb) {
    const { bucketName, partNumber, size, objectKey, contentMD5, uploadId }
        = params;
    const totalSubParts = 1;
    const blockId = getBlockId(uploadId, partNumber, 0);
    const passThrough = new stream.PassThrough();
    const options = {};
    if (contentMD5) {
        options.useTransactionalMD5 = true;
        options.transactionalContentMD5 = contentMD5;
    }
    request.pipe(passThrough);
    return errorWrapperFn('uploadPart', 'createBlockFromStream',
        [blockId, bucketName, objectKey, passThrough, size, options,
        (err, result) => {
            if (err) {
                log.error('Error from B2 data backend uploadPart',
                    { error: err.message, dataStoreName });
                if (err.code === 'ContainerNotFound') {
                    return cb(errors.NoSuchBucket);
                }
                if (err.code === 'InvalidMd5') {
                    return cb(errors.InvalidDigest);
                }
                if (err.code === 'Md5Mismatch') {
                    return cb(errors.BadDigest);
                }
                return cb(errors.InternalError.customizeDescription(
                    `Error returned from B2: ${err.message}`)
                );
            }
            const eTag = objectUtils.getHexMD5(result.headers['content-md5']);
            return cb(null, eTag, totalSubParts, size);
        }], log, cb);
};

module.exports = putSinglePart;
