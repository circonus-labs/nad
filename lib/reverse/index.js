// Copyright 2016 Circonus, Inc. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

'use strict';

/* xeslint-disable no-process-exit */
/* xeslint-disable no-mixed-operators */
/* xeslint-disable no-sync */

const path = require('path');

const nad = require('nad');
const settings = require(path.join(nad.lib_dir, 'settings'));
const broker = require(path.join(nad.lib_dir, 'broker'));
const client = require(path.join(nad.lib_dir, 'apiclient'));
const noit = require(path.resolve(path.join(__dirname, 'noit')));
const log = settings.logger.child({ module: 'reverse' });

// //////////////////////////////////////////////////////////////////////
// setup optional reverse sockets
// //////////////////////////////////////////////////////////////////////

// this is a module local dict to hold the reverse connections we make
// in setup_reverse.  it exists merely to keep the connections alive which
// act as proxies and all incoming calls to this nad instance will be "pull"
// style HTTP GET requests handled by the normal "handler" function.
const revs = {};
let broker_ca = null;

/**
 * fetch_check retrieves a check definition using the Circonus API
 * @returns {Object} promise
 */
function fetch_check() {
    return new Promise((resolve, reject) => {
        let req_path = `/check_bundle?f_type=json:nad&f_target=${settings.reverse.target}`;

        if (settings.reverse.check_bundle_id !== null) {
            req_path = `/check_bundle/${settings.reverse.check_bundle_id}`;
        }

        log.debug({ req_path }, 'calling circonus api');

        client.get(req_path, null).
            then((parsed_body, code, raw_body) => { // eslint-disable-line no-unused-vars
                let invalid_check = false;

                if (parsed_body === null) {
                    invalid_check = true;
                } else if (typeof parsed_body !== 'object' && !Array.isArray(parsed_body)) {
                    invalid_check = true;
                }
                if (Array.isArray(parsed_body) && parsed_body.length === 0) {
                    invalid_check = true;
                }

                if (invalid_check) {
                    const msg = 'unable to retrieve viable check for reverse';

                    log.fatal({
                        check_bundle_id : settings.reverse.check_bundle_id,
                        host            : settings.reverse.target,
                        req_path
                    }, msg);
                    reject(new Error(msg));

                    return;
                }

                let check = {};

                if (Array.isArray(parsed_body)) {
                    check = parsed_body[0];
                } else {
                    check = parsed_body;
                }

                resolve(JSON.parse(JSON.stringify(check)));
            }).
            catch((err, parsed_body, code, raw_body) => {
                log.error({
                    code,
                    error: err,
                    parsed_body,
                    raw_body
                }, 'reverse connection setup error');
                reject(err);
            });
    });
}

/** verify_check verifies a check contains valid reverse connection information
 * @arg {Object} check definition
 * @returns {Object} promise
 */
function verify_check(check) {
    return new Promise((resolve, reject) => {
        if (!{}.hasOwnProperty.call(check, '_reverse_connection_urls')) {
            log.fatal({ check_cid: check._cid }, 'invalid check, does not contain a reverse connection URL');
            reject(new Error('invalid check, no reverse conn URL'));

            return;
        }

        if (!Array.isArray(check._reverse_connection_urls) ||
            check._reverse_connection_urls.length === 0) {
            log.fatal({ check_cid: check._cid }, 'invalid check, reverse connection URL attribute is invalid');
            reject(new Error('invalid check, reverse conn URL invalid'));

            return;
        }

        // set check id if one was not provided via --cid nad configuration option
        if (settings.reverse.check_bundle_id === null) {
            const cid = check._cid.replace('/check_bundle/', '');

            settings.reverse.check_bundle_id = cid;
            settings.statsd.host_check_id = cid;
        }

        resolve(check);
    });
}

/**
 * setup_reverse initializes the reverse connection
 * @returns {Object} promise
 */
function setup_reverse() {
    return new Promise((resolve, reject) => {
        broker.loadCA().
            then((cert) => {
                broker_ca = cert;
            }).
            then(fetch_check).
            then(verify_check).
            then((check) => {
                for (const rev_url of check._reverse_connection_urls) {
                    const parts = (/^mtev_reverse:\/\/(.+):(\d+)\/([^.]+)$/).exec(rev_url);

                    if (!parts) {
                        const msg = 'invalid reverse connection URL';

                        if (check._reverse_connection_urls.length === 1) {
                            log.fatal({ rev_url }, msg);
                            reject(new Error(msg));

                            return;
                        }

                        log.warn({ rev_url }, `${msg}, skipping`);
                        continue;
                    }

                    const host = parts[1];
                    const port = parts[2];
                    const url_path = parts[3];

                    revs[rev_url] = new noit.Connection(host, port, broker_ca);
                    revs[rev_url].reverse(url_path, '127.0.0.1', settings.listen[0].port);
                }

                resolve();
            }).
            catch((err) => {
                reject(err);
            });
    });
}

module.exports = setup_reverse;
