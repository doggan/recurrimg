var async = require('async'),
    request = require('request'),
    _ = require('lodash');

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
            return onFinished(new Error('Request failure: ' + err.message));
        }

        onFinished(err, JSON.parse(body));
    });
}

/**
 * Choose the next image to search for using the results
 * of the previous search images until now.
 */
function chooseNextSearchImage(possibleSearchImages, alreadySearchedImages) {
    if (possibleSearchImages.length === 0) {
        console.warn('No images to choose from.');
        return false;
    }

    // Avoid infinite oscillation by not searching with images we've previously
    // searched for.
    var resultImage = _.find(possibleSearchImages, function(img) {
        return !_.contains(alreadySearchedImages, img);
    });

    return resultImage;
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

                    var prevSearchImageUrl = searchImageUrl;
                    searchImageUrl = chooseNextSearchImage(results.similar_images, resultImageUrls);

                    if (!searchImageUrl) {
                        return cb(new Error('Searching for image [' + prevSearchImageUrl + '] produced no searchable results.'));
                    }

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
