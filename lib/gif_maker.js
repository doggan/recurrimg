var fs = require('fs'),
    mkdirp = require('mkdirp'),
    rimraf = require('rimraf'),
    path = require('path'),
    _ = require('lodash'),
    async = require('async'),
    GIFEncoder = require('gifencoder'),
    pngFileStream = require('png-file-stream'),
    sharp = require('sharp');

var RESIZED_IMAGE_BACKGROUND_COLOR = {
    r: 0,
    g: 0,
    b: 0,
    a: 1
};

function findSourceImages(sourceImageDir) {
    var VALID_IMAGE_EXTENSIONS = require('./constants').VALID_IMAGE_EXTENSIONS;

    var imageFileNames = fs.readdirSync(sourceImageDir);
    imageFileNames = _.remove(imageFileNames, function(imagePath) {
        return _.contains(VALID_IMAGE_EXTENSIONS, (path.extname(imagePath)).toLowerCase());
    });
    return imageFileNames;
}

/**
 * Resize and pre-process all source images.
 * For gif processing, we need all images to be the same size.
 * Also, to make everything easier, we turn them all into pngs.
 */
function preprocessImages(tempDir, sourceImageDir, imageFileNames, gifParams, onFinished) {
    var works = [];

    _.forEach(imageFileNames, function(imageFileName) {
        var fromImagePath = path.join(sourceImageDir, imageFileName);

        // Trim the extension from the file name.
        var ext = path.extname(imageFileName);
        var baseName = imageFileName.substring(0, imageFileName.length - ext.length);
        var toImagePath = path.join(tempDir, baseName + '.png');

        // Resize.
        works.push(function(cb) {
            sharp(fromImagePath)
                .embed() // preserve aspect ration
                .background(RESIZED_IMAGE_BACKGROUND_COLOR)
                .resize(gifParams.sizeX, gifParams.sizeY)
                .toFile(toImagePath, function(err) {
                    cb(err);
                });
        });

        console.log('Preprocessing image: ' + fromImagePath + ' -> ' + toImagePath);
    });

    // Using series and not parallel.
    // sharp library seems to have some memory issues
    // when resizing multiple images at the same time.
    async.series(works, function(err) {
        onFinished(err);
    });
}

function generateGif(tempDir, gifParams, onFinished) {
    var gifOptions = {
        repeat: gifParams.repeat,
        delay: gifParams.delay,
        quality: gifParams.quality
    };

    console.log('Creating gif: ' + gifParams.path);

    var encoder = new GIFEncoder(gifParams.sizeX, gifParams.sizeY);
    pngFileStream(path.join(tempDir, '*.png'))
        .pipe(encoder.createWriteStream(gifOptions))
        .pipe(fs.createWriteStream(gifParams.path))
        .on('close', function () {
            onFinished();
        });
}

function defaultParam(param, defaultValue) {
    return typeof param !== 'undefined' ? param : defaultValue;
}

module.exports = {
    /*
        Generate a GIF image using all images in sourceImageDir as
        the input.
     */
    makeGif: function(sourceImageDir, gifParams, onFinished) {
        if (typeof gifParams.path === 'undefined') {
            return onFinished(new Error('Output gif path must be specified.'));
        }

        gifParams.sizeX = defaultParam(gifParams.sizeX, 64);
        gifParams.sizeY = defaultParam(gifParams.sizeY, 64);
        gifParams.delay = defaultParam(gifParams.delay, 500);
        gifParams.quality = defaultParam(gifParams.quality, 10);
        gifParams.repeat = defaultParam(gifParams.repeat, 0); // repeat by default

        var imageFileNames = findSourceImages(sourceImageDir);

        if (imageFileNames.length === 0) {
            console.warn('No input images found.');
            return onFinished();
        }

        // Make temp directory for our resized files.
        var tempDir = path.join(sourceImageDir, '/temp');
        mkdirp.sync(tempDir);

        preprocessImages(tempDir, sourceImageDir, imageFileNames, gifParams, function(err) {
            if (err) {
                return onFinished(new Error('Error during preprocessing images: ' + err.message));
            }

            generateGif(tempDir, gifParams, function() {
                // Delete temp dir + contents.
                rimraf.sync(tempDir);

                onFinished();
            });
        });
    }
};
