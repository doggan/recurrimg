var mkdirp = require('mkdirp'),
    rimraf = require('rimraf'),
    imgSearch = require('./image_search'),
    imgDownload = require('./image_download'),
    gifMaker = require('./gif_maker');

// TODO:
// - Fix rimraf issue (shouldn't delete directory from start... safety issue)
// - pass everything as args via driver app
// - Might be nice to output url breadcrumb trail to file for easy repro (json object).. to start a new search @ last url

function parseParams(params) {
    if (typeof params === 'undefined') {
        throw new Error("param object not specified");
    }
    if (typeof params.startImage === 'undefined') {
        throw new Error('start image not specified');
    }
    if (typeof params.iterationCount === 'undefined') {
        throw new Error('iteration count not specified');
    }
    if (typeof params.imageServer === 'undefined') {
        throw new Error('image search server not specified');
    }
    if (typeof params.outputDir === 'undefined') {
        throw new Error('output directory path not specified');
    }

    var gifOptions = params.gifOptions;
    gifOptions = typeof gifOptions === 'undefined' ? {} : gifOptions;
    if (typeof gifOptions.dimensions === 'undefined') {
        gifOptions.dimensions = [100, 100];
    } else if (gifOptions.dimensions.length !== 2) {
        throw new Error('gif x/y dimensions must be spcified as: x,y');
    }

    gifOptions.delay = typeof gifOptions.delay === 'undefined' ? 100 : gifOptions.delay;
    gifOptions.quality = typeof gifOptions.quality === 'undefined' ? 10 : gifOptions.quality;
    gifOptions.repeat = typeof gifOptions.repeat === 'undefined' ? 0 : gifOptions.repeat;

    params.gifOptions = gifOptions;
}

module.exports = {
    go: function(params, onFinished) {
        parseParams(params);

        console.log();
        console.log('Performing recursive image search:');
        console.log('...start image: ' + params.startImage);
        console.log('...count: ' + params.iterationCount);
        console.log('...image server: ' + params.imageServer);
        console.log('...output dir: ' + params.outputDir);
        console.log('...gif options: ' + JSON.stringify(params.gifOptions));
        console.log();

        // Create our output directory. Delete first to make sure contents is empty.
        // rimraf.sync(params.outputDir); // TODO: dangerous...
        mkdirp.sync(params.outputDir);

        imgSearch.doRecursiveImageSearch(
            params.imageServer,
            params.iterationCount,
            params.startImage,
            function(err, resultImageUrls) {
                if (err) {
                    console.error('Recursive image search failure: ' + err.message);
                }

                console.log('Downloading images...');
                imgDownload.downloadImages(resultImageUrls, params.outputDir, function(err) {
                    if (err) {
                        console.error('Image download failure.');
                        return onFinished(err, resultImageUrls);
                    }

                    params.gifOptions.path = './result.gif';

                    console.log('Generating gif...');
                    gifMaker.makeGif(params.outputDir, params.gifOptions, function(err) {
                        if (err) {
                            console.error('Gif generation failure: ' + err.message);
                            return onFinished(err, resultImageUrls);
                        }

                        onFinished(null, resultImageUrls);
                    });
                });
            });
    }
};
