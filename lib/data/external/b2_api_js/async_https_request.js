const https = require('https');

function async_https_request(options, data, parse) {
	options['User-Agent'] = 'Zenko';
	return new Promise((resolve, reject) => {
		const req = https.request(options, (res) => {
			res.setEncoding('utf8');
			res.on('data', (chunk) => {
				if (200 != res.statusCode) {
					err = JSON.parse(chunk);
					reject('problem with request: ' + err.code +
						'(' + err.status + ') : ' + err.message)
				}
				else
					resolve(parse ? JSON.parse(chunk) : chunk);
			});
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
