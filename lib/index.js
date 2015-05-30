var async = require('async'),
    request = require('request'),
    mkdirp = require('mkdirp'),
    fs = require('fs'),
    url = require('url'),
    path = require('path');

var IMAGE_SEARCH_URI = 'http://localhost:5000/search';

function doSearch(imgUrl, onFinished) {
    console.log('Performing search for: ' + imgUrl);

    var content = JSON.stringify({
        'image_url': imgUrl
    });

    var options = {
        uri: IMAGE_SEARCH_URI,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': content.length
        },
        body: content
    };

    request(options, function(err, res, body) {
        if (err || res.statusCode !== 200) {
            return onFinished(new Error('Request failure: ' + res.statusCode));
        }

        onFinished(err, JSON.parse(body));
    });
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

function downloadImage(imageUrl, outFilePath, onFinished) {
    console.log('Downloading: ' + imageUrl);

    request.head(imageUrl, function(err, res) {
        if (err || res.statusCode !== 200) {
            return onFinished(new Error('Image download failure: ' + imageUrl));
        }

        request(imageUrl)
            .pipe(fs.createWriteStream(outFilePath))
            .on('close', onFinished);
    });
}

function downloadImages(outputDir, imageUrls, onFinished) {
    var work = [];
    var workFunc = function(imageUrl, outFilePath) {
        return function(cb) {
            downloadImage(imageUrl, outFilePath, cb);
        };
    };

    for (var i = 0; i < imageUrls.length; i++) {
        var imageUrl = imageUrls[i];
        var pathname = url.parse(imageUrl).pathname;    // /x/y/z.png
        var filePath = outputDir + i.toString() + path.extname(pathname);
        work.push(workFunc(imageUrl, filePath));
    }

    async.parallel(work,
        function(err) {
            onFinished(err);
        }
    );
}

function main() {
    var startImageUrl = 'http://upload.wikimedia.org/wikipedia/commons/2/29/Voyager_spacecraft.jpg';
    var count = 0;
    var dir = './output/';

    console.log('Creating output directory: ' + dir);
    mkdirp.sync(dir);

    console.log('Doing recursive image search...');
    doRecursiveImageSearch(count, startImageUrl, function(err, resultImageUrls) {
        if (err) {
            console.error('Recursive image search failure.');
            return;
        }

        console.log('Downloading images...');
        downloadImages(dir, resultImageUrls, function(err) {
            if (err) {
                console.error('Image download failure.');
                return;
            }

            /// TODO:
        });
    });
}

main();
