// Copyright 2016 Circonus, Inc. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

'use strict';

/* eslint-disable global-require */

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

log.info({ name: settings.app_name, version: settings.app_version }, 'initializing');

if (settings.is_windows) {
    try {
        log.info('loading WMI module for Windows platform');
        circwmi = require('circwmi');
    } catch (err) {
        const msg = 'unable to load circwmi module';

        log.fatal({ err: err.message }, msg);
        console.error(settings.pfx_error, msg, err);
        process.exit(1);
    }
}

// ############################################################################
//
// handlers for http/https server requests
//

/**
 * handle_invalid_request responds to invalid requests
 * @arg {Object} req request object
 * @arg {Object} res response object
 * @returns {null} nothing
 */
function handle_invalid_request(req, res) {
    log.debug({
        method : req.method,
        path   : req.url
    }, 'invalid request');
    res.writeHead(404, 'invalid request');
    res.end();
}

/**
 * handle_get processes GET requests
 * @arg {Object} req request object
 * @arg {Object} res response object
 * @returns {null} nothing
 */
function handle_get(req, res) {
    let matches = null;

    // '/' or '/run' - all plugins
    if (/^\/(?:run)?$/.test(req.url_info.pathname)) {
        plugins.run(req, res, null);

        return;
    }

    // '/run/plugin' - specific plugin
    matches = (/^\/run\/(.+)$/).exec(req.url_info.pathname);
    if (matches) {
        plugins.run(req, res, matches[1]);

        return;
    }

    // '/inventory' - loaded plugin meta data
    if (/^\/inventory$/.test(req.url_info.pathname)) {
        plugins.inventory(res, (/\?full/).test(req.url_info.search));

        return;
    }

    // windows specific
    if (settings.is_windows) {
        if ((/^\/wmi\/get-categories$/).test(req.url_info.pathname)) {
            log.debug('wmi categories request');
            circwmi.get_categories(res);

            return;
        }
        matches = (/^\/wmi\/(.+)$/).exec(req.url_info.pathname);
        if (matches) {
            log.debug({ category: matches[1] }, 'wmi counters request');
            circwmi.get_counters_for_category(
                res,
                matches[1],
                settings.debug_dir,
                settings.wipe_debug_dir);

            return;
        }
    }

    handle_invalid_request(req, res);
}

/**
 * handle_put_post processes PUT and POST requests
 * @arg {Object} req request object
 * @arg {Object} res response object
 * @arg {Array} body_chunks put/post body
 * @returns {null} nothing
 */
function handle_put_post(req, res, body_chunks) {
    if (body_chunks.length === 0) {
        handle_invalid_request(req, res);

        return;
    }

    const matches = (/^\/write\/(.+)$/).exec(req.url_info.pathname);

    if (matches) {
        const body = Buffer.concat(body_chunks).toString();

        push_receiver.
            native_obj.
            store_incoming_data(matches[1], body);
        res.writeHead(200, 'OK', { 'Content-Type': 'text/plan' });
        res.end();

        return;
    }

    handle_invalid_request(req, res);
}

/**
 * handler routes web requests
 * @arg {Object} req request object
 * @arg {Object} res response object
 * @returns {null} nothing
 */
function handler(req, res) {
    const body_chunks = [];

    req.addListener('data', (chunk) => {
        body_chunks.push(chunk);
    });

    req.addListener('end', () => {
        req.url_info = url.parse(req.url); // eslint-disable-line no-param-reassign

        log.debug({
             base   : req.url,
             method : req.method,
             path   : req.url_info.pathname
        }, 'request');

        switch (req.method) {
            case 'GET': {
                handle_get(req, res);
                break;
            }
            case 'POST': // fallthrough
            case 'PUT': {
                handle_put_post(req, res, body_chunks);
                break;
            }
            default: {
                handle_invalid_request(req, res);
                break;
            }
        }
    });
}

// ############################################################################
//
// Bootstrap functions
//

/**
 * load_push_receiver loads and starts the push_receiver module
 * @returns {Object} promise
 */
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

        log.info('push receiver handler loaded');
        resolve();
    });
}

/**
 * initialize_plugin_manager initializes the plugin manager after the push
 * receiver is loaded and starts the initial scan for plugins
 * @returns {Object} promise
 */
function initialize_plugin_manager() {
    plugins = new Plugins.Manager(push_receiver);

    return plugins.scan();
}

/**
 * install_signal_handler sets up a siginal handler
 * @returns {Object} promise (resolved)
 */
function install_signal_handler() {
    log.info('installing SIGHUP handler for plugin rescans');
    process.on('SIGHUP', () => {
        log.info('SIGHUP received, re-scanning plugins');
        plugins.scan().
            catch((err) => {
                log.error({ err: err.message }, 'SIGHUP plugin scan, ignoring');
            });
    });

    return Promise.resolve();
}

/**
 * start_http_servers starts the main nad process http servers
 * @returns {Object} promise
 */
function start_http_servers() {
    return new Promise((resolve, reject) => {
        if (settings.listen.length === 0) {
            log.warn('no http servers configured, skipping');
            resolve();

            return;
        }

        for (const server of settings.listen) {
            log.debug({ server }, 'starting server');
            try {
                http.createServer(handler).listen(server.port, server.address);
                log.info({ server }, 'listening');
            } catch (err) {
                log.fatal({
                    err: err.message,
                    server
                }, 'failed to start server');
                reject(err);

                return;
            }
        }

        log.info('http servers started');
        resolve();
    });
}

/**
 * start_https_servers starts the main nad process http servers
 * @returns {Object} promise
 */
function start_https_servers() {
    return new Promise((resolve, reject) => {
        if (settings.ssl.listen.length === 0) {
            log.warn('no https servers configured, skipping');
            resolve();

            return;
        }

        for (const server of settings.ssl.listen) {
            log.debug({ server }, 'starting SSL server');
            try {
                https.
                    createServer(settings.ssl.creds, handler).
                    listen(server.port, server.address);
                log.info({ server }, 'listening');
            } catch (err) {
                log.fatal({
                    err: err.message,
                    server
                }, 'failed to start SSL server');
                reject(err);

                return;
            }
        }

        log.info('https servers started');
        resolve();
    });
}

/**
 * start_reverse starts the reverse connection initialization
 * @returns {Object} promise
 */
function start_reverse() {
    return new Promise((resolve, reject) => {
        if (!settings.reverse.enabled) {
            log.warn('reverse connector not enabled, skipping');
            resolve();

            return;
        }

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
                log.info('reverse connector loaded');
                resolve();
            }).
            catch((err) => {
                log.fatal({ err: err.message }, 'unable to set up reverse connection');
                reject(err);
            });
    });
}

/**
 * start_statsd starts the nad-statsd listener initialization
 * @returns {Object} promise
 */
function start_statsd() {
    return new Promise((resolve, reject) => {
        if (!settings.statsd.enabled) {
            log.warn('statsd not enabled, skipping');
            resolve();

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

        log.info('statsd listener loaded');
        resolve();
    });
}

/**
 * drops privileges to configured (or default) user:group
 * @returns {Object} promise
 */
function drop_privileges() {
    return new Promise((resolve, reject) => {
        // NOTE: primary benefits of performing this drop in situ:
        //       1. nad can only run as root intentionally (e.g. user
        //          supplied`--uid=0` on command line)
        //       2. permissions issues manifest when nad is run from
        //          the command line, not just when run as service

        // if not running as root, don't drop privileges.
        // implies nad was started as the intended user.
        if (process.getuid() !== 0) {
            log.warn('not running as root, skipping drop privileges');
            resolve();

            return;
        }

        // if user to drop to is root, ignore...
        if ((/^(root|0)$/i).test(settings.drop_uid)) {
            log.warn('already running as root, skipping drop privileges');
            resolve();

            return;
        }

        log.info({
            gid : settings.drop_gid,
            uid : settings.drop_uid
        }, 'dropping privileges');

        try {
            process.initgroups(settings.drop_uid, settings.drop_gid);
            process.setgid(settings.drop_gid);
        } catch (err) {
            log.warn({
                err : err.message,
                gid : settings.drop_gid
            }, 'unable to set group, ignoring');
        }

        try {
            process.setuid(settings.drop_uid);
        } catch (err) {
            log.fatal({
                err : err.message,
                uid : settings.drop_uid
            }, 'failed to drop user privileges');
            reject(err);
        }

        log.info(`running as uid:${settings.drop_uid}`);
        resolve();
    });
}

//
// Start the NAD process
//
// sequenced startup procedure
load_push_receiver().
    then(initialize_plugin_manager).
    then(install_signal_handler).
    then(start_http_servers).
    then(start_https_servers).
    then(start_reverse).
    then(start_statsd).
    then(drop_privileges).
    then(() => {
        log.info('NAD bootstrap complete');
    }).
    catch((err) => {
        log.fatal({ err: err.message }, 'starting NAD process');
        console.error(settings.pfx_error, 'starting NAD process', err);
        process.exit(1);
    });

// END
