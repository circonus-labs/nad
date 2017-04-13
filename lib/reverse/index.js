'use strict';

/* eslint-disable no-process-exit */
/* eslint-disable no-mixed-operators */
/* eslint-disable no-sync */

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

function initiate_reverse() {
    return new Promise((resolve, reject) => {
        let reqPath = `/check_bundle?f_type=json:nad&f_target=${settings.reverse.target}`;

        if (settings.reverse.check_bundle_id !== null) {
            reqPath = `/check_bundle/${settings.reverse.check_bundle_id}`;
        }

        log.debug({ url_path: reqPath }, 'calling circonus api');
        client.get(reqPath, null).
            then((parsed_body, code, raw_body) => { // eslint-disable-line no-unused-vars
                const data = parsed_body;

                if (data === null || typeof data !== 'object' || Array.isArray(data) && data.length === 0) {
                    if (settings.reverse.check_bundle_id === null) {
                        log.fatal({ host: settings.hostname }, 'configuration for reverse - searching yielded no applicable json:nad check');
                    } else {
                        log.fatal({ check_bundle_id: settings.reverse.check_bundle_id }, 'configuration for reverse - unable to retrieve check object with API.');
                    }
                    reject(new Error('unable to retrieve viable check for reverse'));
                    return;
                }

                let check = {};

                if (Array.isArray(data)) {
                    check = data[0];
                } else {
                    check = data;
                }

                if (!{}.hasOwnProperty.call(check, '_reverse_connection_urls')) {
                    log.fatal({ check_cid: check._cid }, 'invalid check, does not contain a reverse connection URL');
                    reject(new Error('invalid check, no reverse conn URL'));
                    return;
                }

                if (!Array.isArray(check._reverse_connection_urls) || check._reverse_connection_urls.length === 0) {
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

                for (const rcURL of check._reverse_connection_urls) {
                    const parts = (/^mtev_reverse:\/\/(.+):(\d+)\/([^.]+)$/).exec(rcURL);

                    if (!parts) {
                        if (check._reverse_connection_urls.length === 1) {
                            log.fatal({ url: rcURL }, 'invalid reverse connection URL');
                            reject(new Error(`invalid reverse connection URL ${rcURL}`));
                            return;
                        }

                        log.warn({ url: rcURL }, 'invalid reverse connection URL, skipping');
                        continue;
                    }
                    revs[rcURL] = new noit.Connection(parts[2], parts[1], broker_ca, null, log);
                    revs[rcURL].reverse(parts[3], '127.0.0.1', settings.listen[0].port);
                }

                resolve();

            }).
            catch((err, parsed_body, code, raw_body) => {
                log.error({
                    error: err,
                    code,
                    parsed_body,
                    raw_body
                }, 'reverse connection setup error');
                reject(err);
            });

    });
}

function setup_reverse() {
    return new Promise((resolve, reject) => {
        broker.loadCA().
            then((cert) => {
                broker_ca = cert;
                return initiate_reverse();
            }).
            then(() => {
                resolve();
            }).
            catch((err) => {
                reject(err);
            });
    });
}

module.exports = setup_reverse;
