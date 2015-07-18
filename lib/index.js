var mkdirp = require('mkdirp'),
    imgSearch = require('./image_search'),
    imgDownload = require('./image_download'),
    gifMaker = require('./gif_maker'),
    path = require('path'),
    _ = require('lodash'),
    Promise = require('bluebird');

function parseParams(params) {
    if (typeof params === 'undefined') {
        throw new Error('param object not specified');
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
    
    if (typeof gifOptions.path === 'undefined') {
        throw new Error('output gif path not specified');
    }

    gifOptions.delay = typeof gifOptions.delay === 'undefined' ? 100 : gifOptions.delay;
    gifOptions.quality = typeof gifOptions.quality === 'undefined' ? 10 : gifOptions.quality;
    gifOptions.repeat = typeof gifOptions.repeat === 'undefined' ? 0 : gifOptions.repeat;

    params.gifOptions = gifOptions;
}

function prepareOutputDirectory(dir) {
    var mkdirpAsync = Promise.promisify(mkdirp);
    var readdirAsync = Promise.promisify(require('fs').readdir);
    var statAsync = Promise.promisify(require('fs').stat);
    var VALID_IMAGE_EXTENSIONS = require('./constants').VALID_IMAGE_EXTENSIONS;

    // Create the directory in case it doesn't exist.
    return mkdirpAsync(dir)
        // Are there any image files within the directory?
        .then(function() {
            return readdirAsync(dir).filter(function(filename) {
                return statAsync(path.join(dir, filename)).then(function(stats) {
                    return stats.isFile() && _.contains(VALID_IMAGE_EXTENSIONS, path.extname(filename).toLowerCase());
                });
            });
        })
        .then(function(imageFiles) {
            // Images existing in output directory.
            if (imageFiles.length !== 0) {
                throw new Error(imageFiles.length + ' images with extensions (' + VALID_IMAGE_EXTENSIONS.join(', ') + ') already exist in output directory. Delete and try again.');
            }
        });
}

module.exports = {
    go: function(params, onFinished) {
        parseParams(params);

        console.log('Recursive image search params:');
        console.log('...start image: ' + params.startImage);
        console.log('...count: ' + params.iterationCount);
        console.log('...image server: ' + params.imageServer);
        console.log('...output dir: ' + params.outputDir);
        console.log('...gif options: ' + JSON.stringify(params.gifOptions));
        console.log();
        
        var resultImageUrls = [];
        
        prepareOutputDirectory(params.outputDir)
            .then(function() {
                console.log('Performing recursive image search...');

                var imgSearchAsync = Promise.promisify(imgSearch.doRecursiveImageSearch);
                var imgSearchParams = {
                    count: params.iterationCount,
                    searchUri: params.imageServer,
                    startImageUrl: params.startImage
                };
                
                return imgSearchAsync(imgSearchParams);
            })
            .then(function(imageUrls) {
                console.log('Downloading images...');
                
                // Store result image urls for easy access.
                resultImageUrls = imageUrls;

                var imgDownloadAsync = Promise.promisify(imgDownload.downloadImages);
                var imgDownloadParams = {
                    imageUrls: imageUrls,
                    outputDir: params.outputDir
                };
                
                return imgDownloadAsync(imgDownloadParams);
            })
            .then(function() {
                console.log('Generating gif...');
                gifMaker.makeGif(params.outputDir, params.gifOptions, function(err) {
                    if (err) {
                        console.error('Gif generation failure: ' + err.message);
                        return onFinished(err, resultImageUrls);
                    }
                    
                    onFinished(null, resultImageUrls);
                });
            })
            .catch(Error, function(e) {
                console.log('Error: ' + e.message);
            });
    }
};
