function getSubPartSize(subPartInfo, subPartIndex, maxSubPartSize) {
    const { lastPartIndex, lastPartSize } = subPartInfo;
    return subPartIndex === lastPartIndex ?
        lastPartSize : maxSubPartSize;
};

module.exports = getSubPartSize;
