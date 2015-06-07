var async = require('async'),
    request = require('request'),
    fs = require('fs'),
    url = require('url'),
    path = require('path');

function downloadImage(imageUrl, outFilePath, imageNum, onFinished) {
    request.head(imageUrl, function(err, res) {
        if (err) {
            return onFinished(new Error('Image download failure: ' + imageUrl));
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

module.exports = {
    downloadImages: function(imageUrls, outputDir, onFinished) {
        var work = [];
        var workFunc = function(imageUrl, outFilePath, imageNum) {
            return function(cb) {
                console.log('Downloading image [' + imageNum + ']: ' + imageUrl);

                downloadImage(imageUrl, outFilePath, imageNum, cb);
            };
        };

        for (var i = 0; i < imageUrls.length; i++) {
            var imageUrl = imageUrls[i];
            var pathname = url.parse(imageUrl).pathname; // /x/y/z.png
            var filePath = path.join(outputDir, (i + 1).toString() + path.extname(pathname));
            work.push(workFunc(imageUrl, filePath, i + 1));
        }

        async.parallel(work,
            function(err) {
                onFinished(err);
            }
        );
    }
};
