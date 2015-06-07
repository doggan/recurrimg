var mkdirp = require('mkdirp'),
    imgSearch = require('./image_search'),
    imgDownload = require('./image_download'),
    gifMaker = require('./gif_maker');

function dumpResultImageUrls(imageUrls) {
    console.log('#### begin dump ####');
    console.log(JSON.stringify(imageUrls));
    console.log('#### end dump ####');
}

function main(onFinished) {
    var startImageUrl = 'http://upload.wikimedia.org/wikipedia/commons/2/29/Voyager_spacecraft.jpg';
    var count = 0;
    var dir = './output/';

    mkdirp.sync(dir);

    console.log('Performing recursive image search...');
    imgSearch.doRecursiveImageSearch(count, startImageUrl, function(err, resultImageUrls) {
        if (err) {
            console.error('Recursive image search failure.');
            return onFinished(err, resultImageUrls);
        }

        console.log('Downloading images...');
        imgDownload.downloadImages(resultImageUrls, dir, function(err) {
            if (err) {
                console.error('Image download failure.');
                return onFinished(err, resultImageUrls);
            }

            var gifParams = {
                path: './result.gif',
                sizeX: 300,
                sizeY: 300,
                delay: 500,
                repeat: 0
            };

            console.log('Generating gif...');
            gifMaker.makeGif(dir, gifParams, function(err) {
                if (err) {
                    console.error('Gif generation failure: ' + err.message);
                    return onFinished(err, resultImageUrls);
                }

                onFinished(null, resultImageUrls);
            });
        });
    });
}

main(function(err, resultImageUrls) {
    if (err) {
        console.error('Failure: ' + err.message);
        dumpResultImageUrls(resultImageUrls);
    } else {
        console.log('Success!');
    }
});
