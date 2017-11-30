function getSubPartInfo(dataContentLength, maxSubPartSize) {
    const numberFullSubParts =
        Math.floor(dataContentLength / maxSubPartSize);
    const remainder = dataContentLength % maxSubPartSize;
    const numberSubParts = remainder ?
        numberFullSubParts + 1 : numberFullSubParts;
    const lastPartSize = remainder || maxSubPartSize;
    return {
        lastPartIndex: numberSubParts - 1,
        lastPartSize,
    };
};

module.exports = getSubPartInfo;
