const padString = require('./padString.js')

function getBlockId(uploadId, partNumber, subPartIndex, splitter) {
    const paddedPartNumber = padString(partNumber, 'partNumber');
    const paddedSubPart = padString(subPartIndex, 'subPart');
    const blockId = `${uploadId}${splitter}partNumber${paddedPartNumber}` +
        `${splitter}subPart${paddedSubPart}${splitter}`;
    return padString(blockId, 'part');
};

module.exports = getBlockId;
