/* eslint-disable */
/* author needs to lint */

const   path    = require('path'),
        spawn   = require('child_process').spawnSync;

var certexpire = function(){};

certexpire.prototype.run = function(d, cb, req, args, instance) {
    var config  = {},
        data    = {};

    /*
     *  Without the config there is nothing to do so bail if we can't find it
     *
     *  Config file format:
     *      { "files": [ { "location": "path/to/certificate", "alias": "optional name alias" } ] }
     *
     */
    try {
        config = require(path.resolve(__dirname,'..','openssl_certificate_expiration.json'));
    }
    catch (err) {
        console.log(err);
        cb(d, data, instance);
        d.running = false;
        return;
    }

    // find the openssl command
    const openssl = spawn('command', ['-v', 'openssl']);
    if ( openssl.status != 0 ) {
        console.error("Could not find the 'openssl' command");
        cb(d, data, instance);
        d.running = false;
        return;
    }

    for ( var i = 0, len = config.files.length; i < len; i++ ) {
        // Yes annoyingly I could find no good baked in way to parse / extract data from a certificate within node, so we
        // are forced to just call openssl to get the enddate, and then parse that
        var endDate = spawn(openssl.stdout.toString().trim(), ['x509', '-enddate', '-noout', '-in', config.files[i].location]),
            name    = config.files[i].alias || config.files[i].location;  // just use the full file path is we don't have an alias

        if ( endDate.status != 0 ) {
            console.error("Error getting enddate from cert via openssl");
        }
        else {
            data[name] = { "expires_in": parseInt((Date.parse(endDate.stdout.toString().trim().replace(/notAfter=/,"")) / 1000) - (Date.now()/1000), 10) };
        }
    }

    cb(d, data, instance);
    d.running = false;
};

module.exports = certexpire;
