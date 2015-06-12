#! /usr/bin/env node

var program = require('commander'),
    packageJSON = require('../package.json'),
    recurrimg = require('./index');

function list(val) {
    return val.split(',');
}

program
    .version(packageJSON.version)
    .option('-i, --image <url>', 'start image url')
    .option('-c, --count <n>', 'iteration count', parseInt)
    .option('-s, --server <url>', 'image search server url')
    .option('-o, --output <path>', 'output directory path for results')
    .option('--dim <x,y>', 'gif x/y dimensions (default = 100x100)', list)
    .option('--delay <n>', 'gif frame delay in ms (default = 100)', parseInt)
    .option('--quality <n>', 'gif image quality 1 - 256 (default = 10)', parseInt)
    .option('--repeat <n>', 'gif repeat: 0 = yes, -1 = no (default = 0)', parseInt)
    .parse(process.argv);

var params = {
    startImage: program.image,
    iterationCount: program.count,
    imageServer: program.server,
    outputDir: program.output,
    gifOptions: {
        dim: program.dim,
        delay: program.delay,
        quality: program.quality,
        repeat: program.repeat
    }
};

function dumpResultImageUrls(imageUrls) {
    console.log('#### begin dump ####');
    console.log(JSON.stringify(imageUrls));
    console.log('#### end dump ####');
}

try {
    recurrimg.go(params, function(err, resultImageUrls) {
        if (err) {
            console.error('Failure: ' + err.message);
            dumpResultImageUrls(resultImageUrls);
        } else {
            console.log('Success!');
        }
    });
} catch (err) {
    console.error();
    console.error('  Error: ' + err.message);
    program.help();
}