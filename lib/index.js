var async = require('async');
var http = require('http');

function doSearch(imgUrl, onFinished) {
    console.log('Performing search for: ' + imgUrl);

    var content = JSON.stringify({
        'image_url': imgUrl
    });

    var options = {
        host: 'localhost',
        port: 5000,
        path: '/search',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': content.length
        }
    };

    var req = http.request(options, function(res) {
        if (res.statusCode !== 200) {
            return onFinished(new Error('Request failure: ' + res.statusCode));
        }
        res.setEncoding('utf8');

        var bufferStr = '';
        res.on('data', function(chunk) {
            bufferStr += chunk.toString();
        });

        res.on('end', function() {
            onFinished(null, JSON.parse(bufferStr));
        });
    });

    req.on('error', function(err) {
        onFinished(err);
    });

    req.write(content);
    req.end();
}

function doRecursiveImageSearch(count, searchImageUrl, onFinished) {
    var resultImageUrls = [];

    // Add the initial search image url.
    resultImageUrls.push(searchImageUrl);

    async.doWhilst(
        // Work callback.
        function(cb) {
            doSearch(searchImageUrl, function(err, results) {
                if (err) {
                    return cb(err);
                }

                // TODO:
                // - avoid infinite oscillating by not allowing returning to image we've processed before
                // - error handling in case of no results

                searchImageUrl = results.similar_images[0];
                resultImageUrls.push(searchImageUrl);

                cb();
            });

            count--;
        },
        // Condition check callback.
        function() {
            return count > 0;
        },
        // Finish callback.
        function(err) {
            if (err) {
                console.error('Error: ' + err.message);
            }

            onFinished(err, resultImageUrls);
        }
    );
}

function main() {
    var startImageUrl = 'http://upload.wikimedia.org/wikipedia/commons/2/29/Voyager_spacecraft.jpg';
    var count = 5;

    doRecursiveImageSearch(count, startImageUrl, function(err, resultImageUrls) {
        if (!err) {
            // console.log(resultImageUrls);
            // TODO:
            // - GET image data
            // - turn images into gif
        }
    });
}

main();
