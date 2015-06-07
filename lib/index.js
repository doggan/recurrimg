var mkdirp = require('mkdirp'),
    imgSearch = require('./image_search'),
    imgDownload = require('./image_download'),
    gifMaker = require('./gif_maker');

function main() {
    var startImageUrl = 'http://upload.wikimedia.org/wikipedia/commons/2/29/Voyager_spacecraft.jpg';
    var count = 0;
    var dir = './output/';

    console.log('Creating output directory: ' + dir);
    mkdirp.sync(dir);

    console.log('Doing recursive image search...');
    imgSearch.doRecursiveImageSearch(count, startImageUrl, function(err, resultImageUrls) {
        if (err) {
            console.error('Recursive image search failure.');
            return;
        }

        console.log('Downloading images...');
        imgDownload.downloadImages(resultImageUrls, dir, function(err) {
            if (err) {
                console.error('Image download failure.');
                return;
            }

            var gifParams = {
                path: './result.gif',
                sizeX: 300,
                sizeY: 300,
                delay: 500,
                repeat: 0
            };

            gifMaker.makeGif(dir, gifParams, function(err) {
                if (err) {
                    console.error('Gif generation failure: ' + err.message);
                    return;
                }

                console.log('Done!');
            });
        });
    });
}

main();
