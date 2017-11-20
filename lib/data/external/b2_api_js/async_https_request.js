const https = require('https');
const stream = require('stream');

function async_https_request(options, data, isNotGet) {
	options['User-Agent'] = 'Zenko';
	return new Promise((resolve, reject) => {
		const req = https.request(options, (res) => {
			if (isNotGet == true) {
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
			else {
				resolve(res);
			}
			});
		req.on('error', function(err) {
			reject('problem with request: ' + err.code +
				'(' + err.status + ') : ' + err.message);
		});
		if (undefined !== data && null !== data && true == isNotGet)
			req.write(data);
		req.end();
	});
}
module.exports = async_https_request;
