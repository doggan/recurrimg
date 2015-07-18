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
                .resize(gifParams.dimensions[0], gifParams.dimensions[1])
                .toFile(toImagePath, function(err) {
                    if (err) {
                        console.error('Error preprocessing image: ' + err.message);
                    }

                    cb();
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

    var encoder = new GIFEncoder(gifParams.dimensions[0], gifParams.dimensions[1]);
    pngFileStream(path.join(tempDir, '*.png'))
        .pipe(encoder.createWriteStream(gifOptions))
        .pipe(fs.createWriteStream(gifParams.path))
        .on('close', function() {
            onFinished();
        });
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

        var imageFileNames = findSourceImages(sourceImageDir);

        if (imageFileNames.length === 0) {
            return onFinished(new Error('No input images found.'));
        }

        // Make temp directory for our resized files.
        var tempDir = path.join(sourceImageDir, '/gif_gen_temp');
        rimraf.sync(tempDir);
        mkdirp.sync(tempDir);

        preprocessImages(tempDir, sourceImageDir, imageFileNames, gifParams, function(err) {
            if (err) {
                return onFinished(new Error('Error during preprocessing images: ' + err.message));
            }

            generateGif(tempDir, gifParams, function() {
                // Cleanup.
                rimraf(tempDir, function() {
                    onFinished();
                });
            });
        });
    }
};
