/* eslint-env node, es6 */
/* eslint-disable no-magic-numbers */
/* eslint max-statements: ["error", 15, { "ignoreTopLevelFunctions": true }]*/


'use strict';

/**
 * Public: test function to filter out malformed packets
 *
 * Parameters:
 *
 *   fields - Array of packet data (e.g. [ '100', 'ms', '@0.1' ])
 *
 * Returns true for a valid packet and false otherwise
 */

function isNumber(str) {
    return Boolean(str && !isNaN(str));
}

function isValidSampleRate(str) {
    let validSampleRate = false;

    if (str.length > 1 && str[0] === '@') {
        const numberStr = str.substring(1);

        validSampleRate = isNumber(numberStr) && numberStr[0] !== '-';
    }

    return validSampleRate;
}

function is_valid_packet(fields) {

    // test for existing metrics type
    if (typeof fields[1] === 'undefined') {
        return false;
    }

    // filter out malformed sample rates
    if (typeof fields[2] !== 'undefined') {
        if (!isValidSampleRate(fields[2])) {
            return false;
        }
    }

    // filter out invalid metrics values
    switch (fields[1]) {
        case 't':
            return true;
        case 's':
            return true;
        case 'g':
            return isNumber(fields[0]);
        case 'ms':
            return isNumber(fields[0]) && Number(fields[0]) >= 0;
        default:
            if (!isNumber(fields[0])) {
                return false;
            }

            return true;
    }

}

// histogram_bucket_id transforms a value into its correct
// bucket and returns the bucket id as a string
function histogram_bucket_id(origVal) { // eslint-disable-line max-statements
    let val = origVal;
    let vString = '';
    let exp = 0;

    if (val === 0) {
        return 'H[0]';
    }

    if (val < 0) {
        vString = '-';
        val *= -1;
    }

    while (val < 10) {
        val *= 10;
        exp -= 1;
    }

    while (val >= 100) {
        val /= 10;
        exp += 1;
    }

    val = Math.floor(val);
    val /= 10;
    exp += 1;

    return `H[${vString}${val.toString()}e${exp.toString()}]`;
}


// make_histogram takes a list of raw values and returns a list of bucket
// strings parseable by the broker
function make_histogram(values) {
    const temp = {};
    const ret = [];

    for (const value of values) {
        const bucket = histogram_bucket_id(value);

        if (!temp[bucket]) {
            temp[bucket] = 0;
        }
        temp[bucket] += 1;
    }

    for (const bkt in temp) { // eslint-disable-line guard-for-in
        ret.push(`${bkt}=${temp[bkt]}`);
    }

    return ret;
}

// sanitize_key returns clean metric name
function sanitize_key(key) {
    return key.
        replace(/\s+/g, '_').
        replace(/\//g, '-').
        replace(/[^a-zA-Z0-9_`\-.]/g, '');
}

module.exports.is_valid_packet = is_valid_packet;
module.exports.make_histogram = make_histogram;
module.exports.sanitize_key = sanitize_key;

// END
