const getSubPartSize = require('./getSubPartSize');
const getBlockId = require('./getBlockId');

function putNextSubPart(errorWrapperFn, partParams, subPartInfo,
subPartStream, subPartIndex, resultsCollector, log, cb) {
    const { uploadId, partNumber, bucketName, objectKey } = partParams;
    const subPartSize = getSubPartSize(
        subPartInfo, subPartIndex);
    const subPartId = getBlockId(uploadId, partNumber,
        subPartIndex);
    resultsCollector.pushOp();
    errorWrapperFn('uploadPart', 'createBlockFromStream',
        [subPartId, bucketName, objectKey, subPartStream, subPartSize,
        {}, err => resultsCollector.pushResult(err, subPartIndex)], log, cb);
};

module.exports = putNextSubPart;
