// NOTE: If we want to extract the object name from these keys, we will need
// to use a similar method to _getKeyAndUploadIdFromMpuKey since the object
// name may have instances of the splitter used to delimit arguments

function getMpuSummaryKey(objectName, uploadId, splitter) {
    return `${objectName}${splitter}${uploadId}`;
};

module.exports = getMpuSummaryKey;
