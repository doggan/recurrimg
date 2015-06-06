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
var RESIZED_IMAGE_BACKGROUND_COLOR = {r: 1, g: 0, b: 0, a: 1};
var GIF_DELAY = 500;

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
function preprocessImages(tempDir, sourceImageDir, imageFileNames, gifSize, onFinished) {
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
                .resize(gifSize.x, gifSize.y)
                .background(RESIZED_IMAGE_BACKGROUND_COLOR)
                .flatten()
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

function generateGif(tempDir, gifPath, gifSize) {
    var gifOptions = {
        repeat: -1,
        delay: GIF_DELAY,
        quality: 10
    };

    console.log('Generating gif: ' + gifPath);

    var encoder = new GIFEncoder(gifSize.x, gifSize.y);
    pngFileStream(path.join(tempDir, '?.png'))
        .pipe(encoder.createWriteStream(gifOptions))
        .pipe(fs.createWriteStream(gifPath));
}

module.exports = {
    /*
        Generate a GIF image using all images in sourceImageDir as
        the input. Returns true on success.
     */
    makeGif: function(sourceImageDir, gifPath, gifSize) {
        var imageFileNames = findSourceImages(sourceImageDir);

        if (imageFileNames.length === 0) {
            console.warn('No input images found.');
            return true;
        }

        // Make temp directory for our resized files.
        var tempDir = path.join(sourceImageDir, '/temp');
        mkdirp.sync(tempDir);

        preprocessImages(tempDir, sourceImageDir, imageFileNames, gifSize, function(err) {
            if (err) {
                console.error('Error during preprocessing images: ' + err.message);
                return false;
            }

            generateGif(tempDir, gifPath, gifSize);

            // Delete temp dir + contents.
            // rimraf.sync(tempDir );

            return true;
        });
    }
};
