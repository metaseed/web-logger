'use strict';

var port = 8088;
var address = '127.0.0.1';
var version = versionTriple('1.0.0');

/**
 * @param {string} version
 * @return {Array}
 */
function versionTriple(version) {
    var triple;
    if (version) {
        triple = version.split('.').map(function (x) {
            return parseInt(x);
        });
    } else {
        triple = [0, 0, 0];
    }
    triple.toString = function () {
        return this.join('.');
    };
    return triple;
}

var adapterFor = (function() {
  var url = require('url'),
    adapters = {
      'http:': require('http'),
      'https:': require('https'),
    };

  return function(inputUrl) {
    return adapters[url.parse(inputUrl).protocol]
  }
}());


var http = require('http');
var fs = require('fs');
var mkdirp = require('mkdirp');
var getDirName = require('path').dirname;

var download = function (url, dest, cb) {
    mkdirp(getDirName(dest), function (err) {
        if (err) return cb(err);

        var file = fs.createWriteStream(dest);
        var request = adapterFor(url).get(url, function (response) {
            response.pipe(file);
            file.on('finish', function () {
                file.close(cb);  // close() is async, call cb after close completes.
            });
        }).on('error', function (err) { // Handle errors
            fs.unlink(dest); // Delete the file async. (But we don't check the result)
            if (cb) cb(err.message);
        });
    });
};
// download('http://www.bdrgames.nl/html5/bloxslider/snd/game_win3.wav','c:/d/ds/loadingbar_bg.wav');

//var downloadto = function(url, )
const urlp = require('url');
var urlReplace = function (url, path) {
    return path + urlp.parse(url).pathname;
}

/**
 * @param {Array} routes
 * @param {string|number} port
 * @param {string} address
 */
function start(routes, port, address) {

    var fs = require('fs');
    var diff_match_patch = require('./diff_match_patch').diff_match_patch;
    var diffMatchPatch = new diff_match_patch();
    var writefile = require('writefile')

    require('http').createServer(function (request, response) {

        var url = request.headers['x-url'];
        if (!url) {
            response.writeHead(200);
            response.end('DevTools Autosave ' + version);
            return;
        }

        var protocolVersion = versionTriple(request.headers['x-autosave-version']);
        if (version[0] !== protocolVersion[0]) {
            var message = 'Cannot save. ';
            if (version[0] < protocolVersion[0]) {
                message += 'Autosave Server is out of date. Update it by running `sudo npm install -g autosave@' + protocolVersion + '`.';
                response.writeHead(500);
            } else {
                message += 'Chrome DevTools Autosave ' + protocolVersion[0] + '.x doesn\'t work with Autosave Server ' + version[0] + '.x.';
                response.writeHead(400);
            }
            error(message);
            response.end(message);
            return;
        }

        var path = '';
        if (routes) {
            var matches;
            for (var i = 0; i < routes.length; i++) {
                var route = routes[i];
                if (route.from.test(url)) {
                    matches = true;
                    break;
                }
            }

            if (!matches) {
                if (i === 1) {
                    internalServerError(url + ' doesn’t match a route ' + route.from);
                } else {
                    internalServerError(url + ' doesn’t match any of the following routes:\n' + routes.map(function (a) {
                        return a.from;
                    }).join('\n'));
                }
                return;
            }

            path = url.replace(route.from, route.to);

            var queryIndex = path.indexOf('?');
            if (queryIndex !== -1) {
                path = path.slice(0, queryIndex);
            }

            path = decodeURIComponent(path);

            if (/^\/[C-Z]:\//.test(path)) {
                // Oh, Windows.
                path = path.slice(1);
            }
        } else {
            path = request.headers['x-path'];
        }

        var chunks = [];
        request.setEncoding('utf8');
        request.on('data', function (chunk) {
            chunks.push(chunk);
        });

        request.on('end', function () {
            // try {
            //     var content = fs.readFileSync(path, 'utf8');
            // } catch (err) {
            //     internalServerError('Cannot read a file. ' + err);
            //     return;g
            // }
            // try {
            //     var patches = JSON.parse(chunks.join(''));
            // } catch (error) {
            //     error('Cannot parse a patch. Invalid JSON: ', error);
            //     return;
            // }
            // var patchResult = diffMatchPatch.patch_apply(patches, content);
            // try {
            //     fs.writeFileSync(path, patchResult[0]);
            // } catch (err) {
            //     internalServerError('Cannot write to a file. ' + err);
            //     return;
            // }
            try {
                var filePath = urlReplace(url, path);
                download(url, filePath);
            } catch(err){
                internalServerError('Cannot download file ' + url + filePath, error);
            }

            response.writeHead(200);
            response.end('OK\n');
            info('SAVED AT: ' + path +" FROM:" + url + ' TO ' + filePath);
            //printPatches(patches, patchResult[1]);
        });

        function internalServerError(message) {
            response.writeHead(500);
            response.end(message);
            error(message);
        }

    }).on('error', function (err) {
        if (err.code === 'EADDRINUSE') {
            error('http://' + address + ':' + port + ' is already in use. Exiting.');
        }
    }).listen(port, address, function () {
        info('DevTools Autosave ' + version + ' is running on http://' + address + ':' + port);
    });
}

/**
 * @param {Array} patches
 * @param {Array} results
 */
function printPatches(patches, results) {
    for (var i = 0, ii = patches.length; i < ii; i++) {
        var patch = patches[i];
        log((results[i] ? '\x1B[37m' : '\x1B[30;41m') + patch.start1 + ':');
        var diffs = patch.diffs;
        for (var j = 0, jj = diffs.length; j < jj; j++) {
            var diff = diffs[j];
            if (diff[0] === 0) {
                log('\x1B[0m' + diff[1]);
            } else {
                var text = diff[1];
                if (text.trim() === '') {
                    text = text.replace(/ /g, '·');
                }
                text = text.replace(/\n/g, '↵\n');
                log((diff[0] === 1 ? '\x1B[32m' : '\x1B[31m') + text);
            }
        }
        log('\n\x1B[0m');
    }
}

function log(text) {
    process.stdout.write(text);
}

function info(text) {
    process.stdout.write('\x1B[36m' + text + '\x1B[0m\n');
}

function error(text) {
    process.stdout.write('\x1B[31m' + text + '\x1B[0m\n');
}

if (module.parent) {
    // Loaded via module, i.e. require('index.js')
    exports.start = start;
    exports.defaultPort = port;
    exports.defaultAddress = address;
    exports.version = version;
} else {
    // Loaded directly, i.e. `node index.js`
    start(null, port, address);
}
