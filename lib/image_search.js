var async = require('async'),
    request = require('request'),
    _ = require('lodash'),
    path = require('path');

function doSearch(searchUri, imgUrl, onFinished) {
    var content = JSON.stringify({
        'image_url': imgUrl
    });

    var options = {
        uri: searchUri,
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

var VALID_IMAGE_EXTENSIONS = require('./constants').VALID_IMAGE_EXTENSIONS;

/**
 * Choose the next image to search for using the results
 * of the previous search images until now.
 */
function chooseNextSearchImage(possibleSearchImages, alreadySearchedImages, ignoreImageUrls) {
    // Only allow images with valid extensions.
    possibleSearchImages = _.filter(possibleSearchImages, function(img) {
        var ext = path.extname(img).toLowerCase();
        return _.contains(VALID_IMAGE_EXTENSIONS, ext);
    });

    // Apply ignore filter.
    possibleSearchImages = _.filter(possibleSearchImages, function(img) {
        return !_.contains(ignoreImageUrls, img);
    });

    // Avoid infinite oscillation by not searching with images we've previously
    // searched for.
    var resultImage = _.find(possibleSearchImages, function(img) {
        return !_.contains(alreadySearchedImages, img);
    });

    return resultImage;
}

module.exports = {
    doRecursiveImageSearch: function(searchUri, count, searchImageUrl, onFinished) {
        var startCount = count;
        var resultImageUrls = [];
        var ignoreImageUrls = [];
        var isBacktracking = false;

        // Add the initial search image url.
        resultImageUrls.push(searchImageUrl);

        async.whilst(
            // Condition check callback.
            function() {
                return count > 0;
            },
            // Work callback.
            function(cb) {
                console.log('Performing search [' + (startCount - count + 1) + '] for: ' + searchImageUrl);

                doSearch(searchUri, searchImageUrl, function(err, results) {
                    if (err) {
                        return cb(err);
                    }

                    var prevSearchImageUrl = searchImageUrl;
                    searchImageUrl = chooseNextSearchImage(results.similar_images, resultImageUrls, ignoreImageUrls);

                    if (!searchImageUrl) {
                        // Can we backtrack?
                        if (resultImageUrls.length > 1 &&
                            !isBacktracking) {

                            console.warn('No similar images. Attempting to backtrack: ' + prevSearchImageUrl);

                            isBacktracking = true;
                            ignoreImageUrls.push(resultImageUrls.pop()); // this produced no results, so ignore it next time

                            searchImageUrl = resultImageUrls[resultImageUrls.length - 1]; // try again with this one

                            // Perform an extra iteration since we're backtracking.
                            count++;

                            cb();
                        } else {
                            console.log('Original results:');
                            console.log(results.similar_images);

                            return cb(new Error('No similar immages: ' + prevSearchImageUrl));
                        }
                    } else {
                        isBacktracking = false;
                        resultImageUrls.push(searchImageUrl);

                        cb();
                    }
                });

                count--;
            },
            // Finish callback.
            function(err) {
                onFinished(err, resultImageUrls);
            }
        );
    }
};
