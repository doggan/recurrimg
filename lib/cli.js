#! /usr/bin/env node

var program = require('commander'),
    packageJSON = require('../package.json'),
    _ = require('lodash'),
    recurrimg = require('./index');

function list(val) {
    return _.map(val.split(','), function(n) {
        return parseInt(n);
    });
}

program
    .version(packageJSON.version)
    .option('-i, --start_image <url>', 'start image url')
    .option('-c, --count <n>', 'iteration count', parseInt)
    .option('-s, --server <url>', 'image search server url')
    .option('-o, --output <path>', 'output directory path for results')
    .option('-g, --gif_path <path>', 'output path for gif result')
    .option('--dimensions <x,y>', 'gif x/y dimensions (default = 100x100)', list)
    .option('--delay <n>', 'gif frame delay in ms (default = 100)', parseInt)
    .option('--quality <n>', 'gif image quality 1 - 256 (default = 10)', parseInt)
    .option('--repeat <n>', 'gif repeat: 0 = yes, -1 = no (default = 0)', parseInt)
    .parse(process.argv);

var params = {
    startImage: program.start_image,
    iterationCount: program.count,
    imageServer: program.server,
    outputDir: program.output,
    gifOptions: {
        path: program.gif_path,
        dimensions: program.dimensions,
        delay: program.delay,
        quality: program.quality,
        repeat: program.repeat
    }
};

try {
    recurrimg.go(params, function(err, resultObject) {
        if (err) {
            console.error('Failure: ' + err.message);
        } else {
            console.log('Success!');
        }
    });
} catch (err) {
    console.error();
    console.error('  Error: ' + err.message);
    program.help();
}
