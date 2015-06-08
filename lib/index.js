var mkdirp = require('mkdirp'),
    rimraf = require('rimraf'),
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
    var count = 50;
    var dir = './output/';
    var IMAGE_SEARCH_URI = 'http://localhost:5000/search';

    // Create our output directory. Delete first to make sure contents is empty.
    // rimraf.sync(dir); // TODO: dangerous...
    mkdirp.sync(dir);

    console.log('Performing recursive image search (' + count + ' times)...');
    imgSearch.doRecursiveImageSearch(IMAGE_SEARCH_URI, count, startImageUrl, function(err, resultImageUrls) {
        if (err) {
            console.error('Recursive image search failure: ' + err.message);
        }

        console.log('Downloading images...');
        imgDownload.downloadImages(resultImageUrls, dir, function(err) {
            if (err) {
                console.error('Image download failure.');
                return onFinished(err, resultImageUrls);
            }

            var gifParams = {
                path: './result.gif',
                sizeX: 200,
                sizeY: 200,
                delay: 200,
                repeat: 0,
                quality: 10
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
