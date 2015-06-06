var async = require('async'),
    request = require('request');

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

module.exports = {
    doRecursiveImageSearch: function(count, searchImageUrl, onFinished) {
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
};
