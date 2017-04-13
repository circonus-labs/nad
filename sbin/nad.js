#!/usr/bin/env node
// -*-Javascript-*-

/* eslint-disable no-process-exit */
/* eslint-disable global-require */

'use strict';

// core modules
const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');

// local modules
const nad = require('nad');
const settings = require(path.join(nad.lib_dir, 'settings'));
const Plugins = require(path.join(nad.lib_dir, 'plugins'));

// globals
const log = settings.logger.child({ module: 'main' });

let plugins = null;         // plugin manager
let push_receiver = null;   // listener, metrics can be 'pushed' to nad
let circwmi = null;         // dynamically load, if platform is windows
let statsd = null;          // dynamically load, if enabled
let reverse = null;         // dynamically load, if enabled

log.info('initializing');

if (settings.is_windows) {
    try {
        log.info('loading WMI module for Windows platform');
        circwmi = require('circwmi');
    } catch (err) {
        const msg = 'unable to load circwmi module';

        log.fatal({ err }, msg);
        console.error(settings.pfx_error, msg, err);
        process.exit(1);
    }
}

// handler processes web requests
function handler(req, res) {
    const bodyChunks = [];

    req.addListener('data', (chunk) => {
        bodyChunks.push(chunk);
    });

    req.addListener('end', () => {
        let matches = null;
        const url_parts = url.parse(req.url);
        const url_path = url_parts.pathname;
        const body = Buffer.concat(bodyChunks).toString();

        log.debug({ method: req.method, path: url_path, base: req.url }, 'request');
        if (req.method === 'GET') {
            // request to run all plugins and return results
            if (/^\/(?:run)?$/.test(url_path)) {
                log.debug('running all scripts');
                plugins.run(req, res, null);
                return;
            }

            // request to run just one plugin and return results
            matches = (/^\/run\/(.+)$/).exec(url_path);
            if (matches) {
                log.debug({ script: matches[1] }, 'running plugin');
                plugins.run(req, res, matches[1]);
                return;
            }

            // request for meta-info about the loaded plugins
            if (/^\/inventory$/.test(url_path)) {
                const full = (/\?full/).test(url_parts.search);

                log.debug('inventory request');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.write(plugins.inventory(full));
                res.end();
                return;
            }

            // wmi-specific
            if (settings.is_windows) {
                if ((/^\/wmi\/get-categories$/).test(url_path)) {
                    log.debug('wmi categories request');
                    circwmi.get_categories(res);
                    return;
                }
                matches = (/^\/wmi\/(.+)$/).exec(url_path);
                if (matches) {
                    log.debug({ category: matches[1] }, 'wmi counters request');
                    circwmi.get_counters_for_category(res, matches[1], settings.debug_dir, settings.wipe_debug_dir);
                    return;
                }
            }
        } else if (push_receiver !== null) {
            matches = (/^\/write\/(.+)$/).exec(url_path);
            if (matches) {
                if (req.method !== 'PUT' && req.method !== 'POST') {
                    res.writeHead(405, 'Method Not Allowed', { Allow: 'PUT, POST' });
                    res.end();
                    return;
                }
                push_receiver.native_obj.store_incoming_data(matches[1], body);
                res.writeHead(200, 'OK', { 'Content-Type': 'text/plan' });
                res.end();
                return;
            }
        }

        // otherwise... consider it an invalid request

        log.debug({ method: req.method, path: url_path }, 'invalid request');
        res.writeHead(404, 'invalid request');
        res.end();
    });

    // if we don't have a data listener the stream starts paused in node 10+
    req.addListener('data', () => {});
}

// start_http_servers starts the main nad process http servers
function start_http_servers() {
    return new Promise((resolve, reject) => {
        for (const server of settings.listen) {
            log.debug({ server }, 'starting server');
            try {
                http.createServer(handler).listen(server.port, server.address);
                log.info({ server }, 'listening');
            } catch (err) {
                log.fatal({ server, err }, 'failed to start server');
                reject(err);
                return;
            }
        }

        for (const server of settings.ssl.listen) {
            log.debug({ server }, 'starting SSL server');

            try {
                https.createServer(settings.ssl.creds, handler).listen(server.port, server.address);
                log.info({ server }, 'listening');
            } catch (err) {
                log.fatal({ server, err }, 'failed to start SSL server');
                reject(err);
                return;
            }
        }

        resolve('http servers started');
    });
}

// start_statsd starts the nad-statsd listener initialization
function start_statsd() {
    return new Promise((resolve, reject) => {
        if (!settings.statsd.enabled) {
            resolve('statsd not enabled, skipping');
            return;
        }

        log.debug('loading statsd listener');
        try {
            statsd = require(path.join(nad.lib_dir, 'statsd'));
            statsd.start();
        } catch (err) {
            log.fatal({ err: err.message }, 'unable to load statsd listener');
            reject(err);
            return;
        }

        resolve('statsd listener loaded');
    });
}

// start_reverse starts the reverse connection initialization
function start_reverse() {
    return new Promise((resolve, reject) => {
        if (!settings.reverse.enabled) {
            resolve('reverse connector not enabled, skipping');
            return;
        }

        // NOTE: if reverse is enabled, have it call start_statsd
        //       after it finishes initializing to ensure that the
        //       statsd module has a host_check_id. reverse will
        //       update settings if it has to 'search' for
        //       a check and one is found.

        log.debug('loading reverse connector');
        try {
            reverse = require(path.join(nad.lib_dir, 'reverse'));
        } catch (err) {
            log.fatal({ err: err.message }, 'unable to load reverse connection module');
            reject(err);
            return;
        }

        reverse().
            then(() => {
                resolve('reverse connector loaded');
            }).
            catch((err) => {
                log.fatal({ err: err.message }, 'unable to set up reverse connection');
                reject(err);
                return;
            });
    });
}

// load_push_receiver loads and starts the push_receiver module
function load_push_receiver() {
    return new Promise((resolve, reject) => {
        log.debug('loading push receiver handler');
        try {
            let PushReceiver = null;

            try {
                PushReceiver = require(path.join(nad.lib_dir, 'push_receiver'));
            } catch (err) {
                log.fatal({ err: err.message }, 'failed to load push_recever module');
                reject(err);
                return;
            }

            // NOTE: this *simulates* a regular plugin
            push_receiver = Plugins.new_plugin('push_receiver');
            push_receiver.is_native = true;
            push_receiver.native_obj = new PushReceiver({ log });
        } catch (err) {
            log.fatal({ err: err.message }, 'unable to initialize push receiver');
            reject(err);
            return;
        }
        resolve('push receiver handler loaded');
    });
}

// bootstrap sequentially starts the various components of the nad process
function bootstrap() {
    return new Promise((resolve, reject) => {
        load_push_receiver().
            then((msg) => {
                log.info(msg);
                plugins = new Plugins.Manager(push_receiver);
                return plugins.scan();
            }).
            then(() => {
                log.info('installing SIGHUP handler to trigger plugin rescan');
                process.on('SIGHUP', () => {
                    log.info('SIGHUP received, re-scanning plugins');
                    plugins.scan().
                        catch((err) => {
                            log.error({ err: err.message }, 'SIGHUP plugin scan, ignoring');
                        });
                });
            }).
            then(() => {
                return start_http_servers();
            }).
            then((msg) => {
                log.info(msg);
                return start_reverse();
            }).
            then((msg) => {
                log.info(msg);
                return start_statsd();
            }).
            then((msg) => {
                log.info(msg);

                // if not running as root, don't drop privileges.
                // implies nad was started as the intended user.
                if (process.getuid() !== 0) {
                    return;
                }

                // if user to drop to is root, ignore...
                if ((/^(root|0)$/i).test(settings.drop_uid)) {
                    return;
                }

                // NOTE: primary benefits of performing this drop in situ:
                //       1. nad can only run as root intentionally (e.g. user
                //          supplied`--uid=0` on command line)
                //       2. permissions issues manifest when nad is run from
                //          the command line, not just when run as service

                log.info({ uid: settings.drop_uid, gid: settings.drop_gid }, 'dropping privileges');

                try {
                    process.initgroups(settings.drop_uid, settings.drop_gid);
                    process.setgid(settings.drop_gid);
                } catch (err) {
                    log.warn({ uid: settings.drop_uid, gid: settings.drop_gid, err: err.message }, 'ignoring, setting group privileges');
                }

                try {
                    process.setuid(settings.drop_uid);
                } catch (err) {
                    log.fatal({ uid: settings.drop_uid, gid: settings.drop_gid, err: err.message }, 'failed to drop privileges');
                    reject(err);
                }
            }).
            then(() => {
                resolve('NAD bootstrap complete');
            }).
            catch((err) => {
                reject(err);
            });
    });
}


//
// Start the NAD process
//
bootstrap().
    then((msg) => {
        log.info(msg);
    }).
    catch((err) => {
        console.error(settings.pfx_error, 'starting NAD process', err);
        process.exit(1);
    });

// END
