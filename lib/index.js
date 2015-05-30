var async = require('async'),
    http = require('http'),
    mkdirp = require('mkdirp'),
    fs = require('fs');

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

function downloadImage(imageUrl, outFilePath, onFinished) {
    var file = fs.createWriteStream(outFilePath);

    console.log('Downloading: ' + imageUrl);
    http.get(imageUrl, function(res) {
        if (res.statusCode !== 200) {
            return onFinished(new Error('Image download failure: ' + imageUrl));
        }
        res.pipe(file);
        onFinished();
    });
}

function downloadImages(imageUrls, onFinished) {
    console.log('imageUrls.Length: ' + imageUrls.length);
    var work = [];
    var workFunc = function(imageUrl, outFilePath) {
        return function(cb) {
            console.log('calling...');
            downloadImage(imageUrl, outFilePath, cb);
        };
    };

    for (var i = 0; i < imageUrls.length; i++) {
        var filePath = dir + i.toString();
        work.push(workFunc(imageUrls[i], filePath));
    }

    async.parallel(work,
        function(err) {
            onFinished(err);
        }
    );
}

/*
- recursively search X images... get array of file paths
- foreach image, GET it from URL and save to local file system
- stich images (in directory) into a single gif image... output
 */



var dir = './output/';
mkdirp.sync(dir);

function main() {
    var startImageUrl = 'http://upload.wikimedia.org/wikipedia/commons/2/29/Voyager_spacecraft.jpg';
    var count = 0;

    console.log('Doing recursive image search...');
    doRecursiveImageSearch(count, startImageUrl, function(err, resultImageUrls) {
        if (err) {
            console.error('Recursive image search failure.');
            return;
        }

        console.log('Downloading images...');
        downloadImages(resultImageUrls, function(err) {
            if (err) {
                console.error('Image download failure.');
                return;
            }

            /// TODO:
        });
    });
}

main();
