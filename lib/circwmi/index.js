'use strict';

/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */

/* eslint max-params: ["error", 5] */

const base32 = require('thirty-two');
const spawn = require('child_process').spawn;

const dutil = require('debug_util');

function process_category_output(output) {
    const lines = output.split('\n');
    const category_array = [];

    for (let i = 0; i < lines.length; i++) {
        let category = lines[i].trim();

        if (category.substring(0, 1) === '\\') {
            const split_category = category.split('\\');

            category = split_category[1];
            if (category !== null && category !== '') {
                if (category_array.length === 0 || category_array[category_array.length - 1] !== category) {
                    category_array.push(category);
                }
            }
        }
    }
    category_array.sort();
    return category_array;
}

function process_metrics(output, data_points) {
    const lines = output.split('\n');
    let start_line = 0;
    let found = false;

    // Header will always start with a begin quotation mark; skip
    // lines until we get to the first that starts with one.

    for (start_line = 0; start_line < lines.length; start_line++) {
        if (lines[start_line].substring(0, 1) === '"') {
            found = true;
            break;
        }
    }

    // We didn't get any valid data from this command... just move on
    if (!found) {
        return true;
    }

    const header = lines[start_line].trim();
    const data = lines[start_line + 1].trim();
    const split_header = header.split('","');
    const split_data = data.split('","');
    const header_array_size = split_header.length - 1;
    const array_size = split_data.length - 1;

    // The header doesn't always match the data for some reason... if it doesn't,
    // run the command again until it does.
    if (header_array_size === array_size) {
      // We have to strip the ending quotation mark off the final array entry
      // I wanted to separate on tabs, but changing the output delimiter on
      // typeperf ties you to a file and won't let you write to stdout. Sadness.
        split_header[header_array_size] = split_header[header_array_size].substring(0,
              split_header[header_array_size].length - 1);
        split_data[array_size] = split_data[array_size].substring(0, split_data[array_size].length - 1);

      // Skip timestamp, start at 1
        for (let i = 1; i <= array_size; i++) {
            const matches = (/^(\\\\[^\\]*)?\\(.*)$/).exec(split_header[i]);

            if (matches && matches[2]) {
                let key = matches[2];

                key = key.replace(/\(([^)]+)\)\\/g, '`$1`');
                key = key.replace(/\\/g, '`');
                data_points[key] = split_data[i];
            } else {
                data_points[split_header[i]] = split_data[i];
            }
        }
        return true;
    }

    return false;
}

function get_categories(res) {
    const set = {};
    const cmd = spawn('typeperf', [ '-q' ]);
    let data = '';

    function send_complete() {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify(set));
        res.end();
    }


    cmd.stdout.on('data', (buff) => {
        data += buff;
    });
    cmd.stdout.on('end', () => {
        set.categories = process_category_output(data);
        send_complete();
    });
}

function get_counters_for_category(res, category, debug_dir, wipe_debug_dir, tries) {
    let set = {};
    let data = '';
    const decoded = base32.decode(category);

    function send_complete() {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify(set));
        res.end();
    }

    if (tries === null) {
        tries = 0;
    }
    const cmd = spawn('typeperf', [ '-sc', '1', `${decoded}\\*` ]);

    cmd.stdout.on('data', (buff) => {
        data += buff;
    });
    cmd.stdout.on('end', () => {
        const success = process_metrics(data, set);

        if (success === true) {
            if (debug_dir) {
                const debug_lines = [];
                let i = 0;

                for (const key in set) {
                    if ({}.hasOwnProperty.call(set, key)) {
                        debug_lines[i] = `${key}\t${set[key]}`;
                        i++;
                    }
                }
                dutil.write_debug_output('wmi', debug_lines, debug_dir, wipe_debug_dir);
            }
            send_complete();
        } else {
            tries++;
            if (tries >= 2) {
                set = {};
                send_complete();
            } else {
                get_counters_for_category(res, category, tries);
            }
        }
    });
}

exports.get_categories = get_categories;
exports.get_counters_for_category = get_counters_for_category;
