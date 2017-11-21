const https = require('https');
const stream = require('stream');

function async_https_request(options, data, returns_stream) {
	options['User-Agent'] = 'Zenko';
	return new Promise((resolve, reject) => {
		const req = https.request(options, (res) => {
			if (returns_stream) {
				resolve(res);
			}
			else {
				res.setEncoding('utf8');
				res.on('data', (chunk) => {
				if (200 != res.statusCode) {
					err = JSON.parse(chunk);
					reject('problem with request: ' + err.code +
						'(' + err.status + ') : ' + err.message)
				}
				else
					resolve(JSON.parse(chunk));
				});
			}
			});
		req.on('error', function(err) {
			reject('problem with request: ' + err.code +
				'(' + err.status + ') : ' + err.message);
		});
		if (undefined !== data && null !== data)
			req.write(data);
		req.end();
	});
}
module.exports = async_https_request;
