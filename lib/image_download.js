var async = require('async'),
    request = require('request'),
    fs = require('fs'),
    url = require('url'),
    path = require('path');

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

module.exports = {
    downloadImages: function(imageUrls, outputDir, onFinished) {
        var work = [];
        var workFunc = function(imageUrl, outFilePath) {
            return function(cb) {
                downloadImage(imageUrl, outFilePath, cb);
            };
        };

        for (var i = 0; i < imageUrls.length; i++) {
            var imageUrl = imageUrls[i];
            var pathname = url.parse(imageUrl).pathname; // /x/y/z.png
            var filePath = path.join(outputDir, i.toString() + path.extname(pathname));
            work.push(workFunc(imageUrl, filePath));
        }

        async.parallel(work,
            function(err) {
                onFinished(err);
            }
        );
    }
};
