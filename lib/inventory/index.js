// perform some type of indexing using files that don't exist
// in most directories and exit - not quite sure what the
// functional purpose of this is... kept in here for backwards
// compatibility.

'use strict';

/* eslint-disable no-process-exit */
/* eslint-disable no-param-reassign */
/* eslint-disable guard-for-in */
/* eslint-disable no-sync */
/* eslint-disable no-bitwise */

const fs = require('fs');
const path = require('path');

// a collection of files that are listed in the JSON in the catalog
// files (the ".index.json" files) in each directory
const catalog = {};

const active = {};

// a collection of files that are "missing" (i.e. listed in the catalog
// files but not in the directories / inaccessible somehow)
const missing = {};

// //////////////////////////////////////////////////////////////////////
// index
// //////////////////////////////////////////////////////////////////////

// a recursive function that once called will recurse down through
// the directories reading the ".index.json" files and examining the
// files and popuating the catalog / active / missing variables
function build_catalog(dir, is_windows) {
    dir = dir || '';

    // attempt to read the ".index.json" catalog file in the directory
    // passed in, and then process each entry in that catalog.
    // Remember each file that isn't in the directory
    try {
        const idxFile = fs.readFileSync(path.join('.', dir, '.index.json'));
        const dirIdx = JSON.parse(idxFile);

        catalog[dir] = dirIdx;
        for (const script in dirIdx) {
            try {
                const info = fs.statSync(path.join('.', dir, script));

                if (!info.isFile()) {
                    throw new Error('');
                }
                if (!is_windows && !(info.mode & parseInt('0100', 8))) {
                    throw new Error('');
                }
            } catch (err) {
                missing[path.join(dir, script)] = true;
            }
        }
    } catch (err) {
        // and do what with it?
    }

    // recurse into all subdirectories and call ourselves again
    const files = fs.readdirSync(path.join('.', dir));

    for (let i = 0; i < files.length; i++) {
        const info = fs.statSync(path.join('.', dir, files[i]));

        if (info && info.isDirectory()) {
            build_catalog(path.join(dir, files[i]), is_windows);
        }
    }
}

// this code is used to generate an "index" of what is in the
// in the config directory.  It's triggered by passing the "-i"
// flag on the command line
module.exports = function index(pluginDir) {
    const is_windows = process.platform === 'win32';

    // ext -- extract extensions from file names
    // procre -- captures the main part of a filename (i.e. without extension)
    const ext = /(?:\.([^.]+))?$/;
    let procre = /^(?!\.)([^/]*?)(?:\..*)$/;

    if (is_windows) {
        procre = /^(?!\.)([^\\]*?)(?:\..*)$/;
    }

    // attempt to change to this directory or die trying
    try {
        process.chdir(pluginDir);
    } catch (err) {
        console.log(`Cannot use directory (${pluginDir}): ${err}`);
        process.exit(-1);
    }

    build_catalog(null, is_windows);

  // read the actual scripts in the config directory
  // ...run the loop for each
    const files = fs.readdirSync('.');
    const base = fs.realpathSync('.') + path.sep;

    for (let i = 0; i < files.length; i++) {
        const matches = procre.exec(files[i]);

        if (!matches) {
            continue;
        }

        const extension = ext.exec(files[i])[1];

        if (extension === 'conf' || extension === 'json') {
            continue;
        }

        let info = fs.lstatSync(files[i]);

        if (info.isSymbolicLink()) {
            info = fs.statSync(files[i]);
        }

        // if this is executable (or we're running on windows)
        if (info.isFile() && (is_windows || info.mode & parseInt('0100', 8))) {
            let realpath = fs.realpathSync(files[i]);

            if (realpath.indexOf(base) === 0) {
                realpath = realpath.substr(base.length);
            }
            active[realpath] = matches[1];
        }
    }

    // generate debug output
    for (const module in catalog) {
        for (const script in catalog[module]) {
            const matches = procre.exec(script);

            if (!matches) {
                console.log(`! ${script}: MALFORMED NAME`);
                continue;
            }

            const extension = ext.exec(script)[1];

            if (extension === 'conf' || extension === 'json') {
                console.log(`! ${script}: CANNOT EXECUTE ${extension} FILES`);
                continue;
            }

            const file = path.join(module, script);
            const desc = catalog[module][script];

            let on = file in active ? '*' : ' ';

            if (file in missing) {
                on = '!';
            }
            delete active[file];
            console.log(`${on} ${path.join(module, matches[1])}: ${desc}`);
        }
    }

    let first = true;

    for (const file in active) {
        if (first) {
            console.log('\n  !!! Rogue scripts !!!');
            first = false;
        }
        console.log(`* ${file}: ???`);
    }
};
