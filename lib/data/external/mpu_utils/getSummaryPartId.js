const padString = require('./padString.js');

function getSummaryPartId(partNumber, eTag, size, splitter) {
    const paddedPartNumber = padString(partNumber, 'partNumber');
    const timestamp = Date.now();
    const summaryKey = `${paddedPartNumber}${splitter}${timestamp}` +
        `${splitter}${eTag}${splitter}${size}${splitter}`;
    return padString(summaryKey, 'part');
};
