const getBlockId = require('./getBlockId');

function getSubPartIds(part, uploadId) {
  [...Array(part.numberSubParts).keys()].map(subPartIndex =>
      getBlockId(uploadId, part.partNumber, subPartIndex));
}

module.exports = getSubPartIds;
