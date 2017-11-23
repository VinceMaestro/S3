const Transform = require('stream').Transform;
const crypto = require('crypto');

/**
 * This class is design to compute sha1 hash at the same time as sending
 * data through a stream. The sha1 hash is then appended.
 */
class SHA1Sum extends Transform {

    /**
     * @constructor
     */
    constructor() {
        super({});
        this.hash = crypto.createHash('sha1');
    }

    /**
     * This function will update the current sha1 hash with the next chunk
     *
     * @param {Buffer|string} chunk - Chunk to compute
     * @param {string} encoding - Data encoding
     * @param {function} callback - Callback(err, chunk, encoding)
     * @return {undefined}
     */
    _transform(chunk, encoding, callback) {
        this.hash.update(chunk, encoding);
        callback(null, chunk, encoding);
    }

    /**
     * This function will end the hash computation
     *
     * @param {function} callback(err)
     * @return {undefined}
     */
    _flush(callback) {
        this.emit('hashed');
		this.push(this.hash.digest('hex'));
        callback(null);
    }

}

module.exports = SHA1Sum;
