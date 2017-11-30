function padString(str, category) {
    const _padFn = {
        left: (str, padString) =>
            `${padString}${str}`.substr(-padString.length),
        right: (str, padString) =>
            `${str}${padString}`.substr(0, padString.length),
    };
    // It's a little more performant if we add pre-generated strings for each
    // type of padding we want to apply, instead of using string.repeat() to
    // create the padding.
    const padSpec = {
        partNumber: {
            padString: '00000',
            direction: 'left',
        },
        subPart: {
            padString: '00',
            direction: 'left',
        },
        part: {
            padString:
            '%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%',
            direction: 'right',
        },
    };
    const { direction, padString } = padSpec[category];
    return _padFn[direction](str, padString);
};

module.exports = padString;
