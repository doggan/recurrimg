var fs = require('fs'),
    mkdirp = require('mkdirp'),
    rimraf = require('rimraf'),
    path = require('path'),
    _ = require('lodash'),
    async = require('async'),
    GIFEncoder = require('gifencoder'),
    pngFileStream = require('png-file-stream'),
    sharp = require('sharp');

var VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];
var RESIZED_IMAGE_BACKGROUND_COLOR = {
    r: 0,
    g: 0,
    b: 0,
    a: 1
};

function findSourceImages(sourceImageDir) {
    var imageFileNames = fs.readdirSync(sourceImageDir);
    imageFileNames = _.remove(imageFileNames, function(imagePath) {
        return _.contains(VALID_EXTENSIONS, path.extname(imagePath));
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

    async.parallel(works, function(err) {
        onFinished(err);
    });
}

function generateGif(tempDir, gifParams) {
    var gifOptions = {
        repeat: gifParams.repeat,
        delay: gifParams.delay,
        quality: gifParams.quality
    };

    console.log('Generating gif: ' + gifParams.path);

    var encoder = new GIFEncoder(gifParams.sizeX, gifParams.sizeY);
    pngFileStream(path.join(tempDir, '?.png'))
        .pipe(encoder.createWriteStream(gifOptions))
        .pipe(fs.createWriteStream(gifParams.path));
}

function defaultParam(param, defaultValue) {
    return typeof param !== 'undefined' ? param : defaultValue;
}

module.exports = {
    /*
        Generate a GIF image using all images in sourceImageDir as
        the input. Returns true on success.
     */
    makeGif: function(sourceImageDir, gifParams) {
        if (typeof gifParams.path === 'undefined') {
            console.error('Output gif path must be specified.');
            return false;
        }

        gifParams.sizeX = defaultParam(gifParams.sizeX, 64);
        gifParams.sizeY = defaultParam(gifParams.sizeY, 64);
        gifParams.delay = defaultParam(gifParams.delay, 500);
        gifParams.quality = defaultParam(gifParams.quality, 10);
        gifParams.repeat = defaultParam(gifParams.repeat, 0); // repeat by default

        var imageFileNames = findSourceImages(sourceImageDir);

        if (imageFileNames.length === 0) {
            console.warn('No input images found.');
            return true;
        }

        // Make temp directory for our resized files.
        var tempDir = path.join(sourceImageDir, '/temp');
        mkdirp.sync(tempDir);

        preprocessImages(tempDir, sourceImageDir, imageFileNames, gifParams, function(err) {
            if (err) {
                console.error('Error during preprocessing images: ' + err.message);
                return false;
            }

            generateGif(tempDir, gifParams);

            // Delete temp dir + contents.
            // rimraf.sync(tempDir );

            return true;
        });
    }
};
