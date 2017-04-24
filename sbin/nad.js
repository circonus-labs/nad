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

log.info('initializing');

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

    const body = Buffer.concat(body_chunks).toString();
    const matches = (/^\/write\/(.+)$/).exec(req.url_info.pathname);

    if (matches) {
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

/**
 * start_http_servers starts the main nad process http servers
 * @returns {Object} promise
 */
function start_http_servers() {
    return new Promise((resolve, reject) => {
        if (settings.listen.length === 0) {
            resolve('no http servers configured, skipping');
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

        resolve('http servers started');
    });
}

/**
 * start_https_servers starts the main nad process http servers
 * @returns {Object} promise
 */
function start_https_servers() {
    return new Promise((resolve, reject) => {
        if (settings.ssl.listen.length === 0) {
            resolve('no https servers configured, skipping');
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

        resolve('https servers started');
    });
}

/**
 * start_statsd starts the nad-statsd listener initialization
 * @returns {Object} promise
 */
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

/**
 * start_reverse starts the reverse connection initialization
 * @returns {Object} promise
 */
function start_reverse() {
    return new Promise((resolve, reject) => {
        if (!settings.reverse.enabled) {
            resolve('reverse connector not enabled, skipping');

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
                resolve('reverse connector loaded');
            }).
            catch((err) => {
                log.fatal({ err: err.message }, 'unable to set up reverse connection');
                reject(err);
            });
    });
}

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
        resolve('push receiver handler loaded');
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

        log.info({
            gid : settings.drop_gid,
            uid : settings.drop_uid
        }, 'dropping privileges');

        // if not running as root, don't drop privileges.
        // implies nad was started as the intended user.
        if (process.getuid() !== 0) {
            resolve('not running as root, skipping drop privileges');

            return;
        }

        // if user to drop to is root, ignore...
        if ((/^(root|0)$/i).test(settings.drop_uid)) {
            resolve('alrady running as root, skipping drop privileges');

            return;
        }

        try {
            process.initgroups(settings.drop_uid, settings.drop_gid);
            process.setgid(settings.drop_gid);
        } catch (err) {
            log.warn({
                err : err.message,
                gid : settings.drop_gid,
                uid : settings.drop_uid
            }, 'ignoring, setting group privileges');
        }

        try {
            process.setuid(settings.drop_uid);
        } catch (err) {
            log.fatal({
                err : err.message,
                gid : settings.drop_gid,
                uid : settings.drop_uid
            }, 'failed to drop privileges');
            reject(err);
        }

        resolve(`running as ${settings.drop_uid}:${settings.drop_gid}`);
    });
}

/**
 * bootstrap sequentially starts the various components of the nad process
 * @returns {Object} promise to start statsd
 */
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

                return start_https_servers();
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

                return drop_privileges();
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
