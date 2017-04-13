'use strict';

/* eslint-disable no-sync */

const fs = require('fs');
const path = require('path');

const nad = require('nad');
const settings = require(path.join(nad.lib_dir, 'settings'));
const log = settings.logger.child({ module: 'debug_util' });

function init_debug(script_name, debug_dir) {
    const debug_file = path.resolve(path.join(debug_dir, `${script_name}.nad_debug`));

    try {
        if (fs.existsSync(debug_file)) {
            fs.unlinkSync(debug_file);
        }
    } catch (err) {
        log.error({ err: err.message, file: debug_file }, 'initializing debug file');
    }
}

function write_debug_output(script_name, debug_lines, debug_dir, wipe_debug_dir) {
    const debug_file = path.resolve(path.join(debug_dir, `${script_name}.nad_debug`));

    try {
        if (wipe_debug_dir) {
            init_debug(script_name, debug_dir);
        }
        fs.appendFile(debug_file, `-----START RECORD-----\n${debug_lines.join('\n')}\n-----END RECORD-----\n`);
    } catch (err) {
        log.error({ err: err.message, file: debug_file }, 'writing to debug file');
    }
}

exports.init_debug = init_debug;
exports.write_debug_output = write_debug_output;
