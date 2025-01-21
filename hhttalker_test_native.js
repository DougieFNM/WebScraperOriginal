var https = require('follow-redirects').https;
var fs = require('fs');

var qs = require('querystring');

var options = {
    'method': 'GET',
    'hostname': 'data.hearthnhome.com',
    'path': '/Token',
    'headers': {
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    'maxRedirects': 20
};

var req = https.request(options, function (res) {
    var chunks = [];

    res.on("data", function (chunk) {
        chunks.push(chunk);
    });

    res.on("end", function (chunk) {
        var body = Buffer.concat(chunks);
        console.log(body.toString());
    });

    res.on("error", function (error) {
        console.error(error);
    });
});

var postData = qs.stringify({
    'grant_type': 'password',
    'username': 'admin@goodmarketinggroup.com',
    'password': 'hHt4Fireplaces!!'
});

req.write(postData);

req.end();