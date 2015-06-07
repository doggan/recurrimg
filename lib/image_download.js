var async = require('async'),
    request = require('request'),
    fs = require('fs'),
    url = require('url'),
    path = require('path');

function downloadImage(imageUrl, outFilePath, imageNum, onFinished) {
    request.head(imageUrl, function(err, res) {
        if (err) {
            console.error('Unable to download image [' + imageNum + ']: ' + imageUrl);
            console.error('Error: ' + err.message);
            return onFinished();
        } else if (res) {
            switch (res.statusCode) {
                // Forbidden
                case 403:
                    console.warn('Unable to download image [' + imageNum + '] - (403): ' + imageUrl);
                    return onFinished();
            }
        }

        request(imageUrl)
            .pipe(fs.createWriteStream(outFilePath))
            .on('close', onFinished);
    });
}

/**
 * Pad leading zeroes onto a digit string.
 */
function pad(num, size) {
    return ('000000000' + num).substr(-size);
}

module.exports = {
    downloadImages: function(imageUrls, outputDir, onFinished) {
        var work = [];
        var workFunc = function(imageUrl, outFilePath, imageNum) {
            return function(cb) {
                console.log('Downloading image [' + imageNum + ']: ' + imageUrl);

                downloadImage(imageUrl, outFilePath, imageNum, cb);
            };
        };

        var digitCount = imageUrls.length.toString().length;

        for (var i = 0; i < imageUrls.length; i++) {
            var imageUrl = imageUrls[i];
            var pathname = url.parse(imageUrl).pathname; // /x/y/z.png

            // Order the images by digit with padded zeroes so that
            // when we process them, they'll be processed in the desired
            // alphabetical order.
            var filePath = path.join(outputDir, pad(i + 1, digitCount) + path.extname(pathname));

            work.push(workFunc(imageUrl, filePath, i + 1));
        }

        async.parallel(work,
            function(err) {
                onFinished(err);
            }
        );
    }
};
