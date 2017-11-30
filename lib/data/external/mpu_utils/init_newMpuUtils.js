const crypto = require('crypto');

function init_newMpuUtils(splitter, overviewMpuKey, maxSubPartSize, hash, digest) {
  const newMpuUtils = {};
  newMpuUtils.splitter = splitter;
  newMpuUtils.overviewMpuKey = overviewMpuKey;
  newMpuUtils.maxSubPartSize = maxSubPartSize;
  newMpuUtils.zeroByteETag = crypto.createHash(hash).update('').digest(digest);
  return newMpuUtils;
}

module.exports = init_newMpuUtils;
