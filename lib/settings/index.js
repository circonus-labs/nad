/* eslint-disable max-lines */
/* eslint-disable no-process-exit */
/* eslint-disable global-require */
/* eslint-disable complexity */
/* eslint-disable no-process-env */
/* eslint-disable no-sync */

// Copyright 2016 Circonus, Inc. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// centralized settings
// common defaults and command line processing

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const url = require('url');
const net = require('net');

const chalk = require('chalk');
const pino = require('pino');
const nad = require('nad');
const pkg = require(path.resolve(path.join(__dirname, '..', '..', '..', 'package.json')));

const COSI_DIR = path.resolve(path.join(nad.base_dir, 'cosi'));
const DEFAULT_PLUGIN_DIR = path.resolve(path.join(nad.etc_dir, 'node-agent.d'));
const DEFAULT_LOG_LEVEL = 'info';
const DEFAULT_IP = null;
const DEFAULT_PORT = 2609;
const DEFAULT_API_URL = 'https://api.circonus.com/v2/';
const DEFAULT_SSL_CERT = path.resolve(path.join(nad.etc_dir, 'na.crt'));
const DEFAULT_SSL_KEY = path.resolve(path.join(nad.etc_dir, 'na.key'));
const DEFAULT_SSL_CA = path.resolve(path.join(nad.etc_dir, 'na.ca'));
const DEFAULT_STATSD_CONFIG = path.resolve(path.join(nad.etc_dir, 'statsd.json'));

let log = null;
let instance = null;

/**
 * helpDetails outputs additional information
 * @returns {Undefined} nothing
 */
function helpDetails() {
    const help = [
        chalk.bold('Target'),
        '',
        '\tIs used by both Reverse and Self-configure.',
        `\t\tReverse will use it to search for a check if a cid is not provided.`,
        `\t\tSelf-configure will use it to configure the check on the broker - it is`,
        `\t\tthe host the broker will connect to in order to pull metrics.`,
        '',
        chalk.bold('Reverse mode'),
        `\tRequired:`,
        `\t\t${chalk.bold('--reverse')} flag signals nad to setup a reverse connection to the broker.`,
        `\tOptional:`,
        `\t\t${chalk.bold('--api-key')} - will pull from cosi if available or fail if not provided.`,
        `\t\t${chalk.bold('--target')} - to enable searching for a check (e.g. on a host not registered by cosi).`,
        `\t\tor`,
        `\t\t${chalk.bold('--cid')} - will pull from cosi if available (and --target not specified).`,
        '',
        `${chalk.bold('StatsD')}`,
        `\tSee https://github.com/circonus-labs/nad/lib/statsd/README.md`,
        `\tfor details on configuring the statsd interface.`,
        '',
        `${chalk.bold('Self-configure')}`,
        `\t${chalk.yellow('DEPRECATED')} -- use cosi instead (https://github.com/circonus-labs/circonus-one-step-install)`,
        '',
        `\tProviding an API token key ${chalk.bold('without')} the reverse flag will initiate a self-configuration attempt.`,
        '',
        '\tRequired:',
        `\t\t${chalk.bold('--api-key')}`,
        `\t\t${chalk.bold('--target')}`,
        `\t\t${chalk.bold('--brokerid')}`,
        `\t\t${chalk.bold('--configfile')}`,
        '\tOptional:',
        `\t\t${chalk.bold('--hostname')}`
    ];

    console.log(help.join('\n')); // eslint-disable-line no-restricted-properties
}

/**
 * emit an error message and exit
 * @arg {String} msg to emit
 * @returns {Undefined} nothing, it exits
 */
function configError(msg) {
    console.error(chalk.red('CONFIGURATION ERROR:'), msg);
    process.exit(1);
}

/**
 * self-configure nad with circonus DEPRECATED
 * @arg {Object} options for self configuration
 * @returns {Undefined} nothing, it exits
 */
function configure_circonus(options) {
    let nsc = null;
    let error = false;
    let config = null;
    let hostname = null;
    let broker_id = null;

    console.error(instance.pfx_warn, 'DEPRECATED', 'use of cosi is preferred');
    console.error('see https://github.com/circonus-labs/circonus-one-step-install');

    if (options.configfile && options.configfile !== '') {
        config = fs.realpathSync(options.configfile);
    } else {
        console.error('--configfile is required.');
        error = true;
    }

    if (options.brokerid && (/^[0-9]+$/).test(options.brokerid)) {
        broker_id = options.brokerid;
    } else {
        console.error('--brokerid is required and should be an integer.');
        error = true;
    }

    if (instance.target === null) {
        console.error('--target is required.');
        error = true;
    }

    if (error) {
        process.exit(1);
    }

    // hostname is optional (and only applies to self-configure)
    if (options.hostname && options.hostname !== '') {
        hostname = options.hostname;
    }

    try {
        nsc = require(path.join(nad.lib_dir, 'nad_self_configure'));
    } catch (err) {
        console.error(chalk.red('ERROR:'), 'unable to load nad_circapi module', err);
        process.exit(1);
    }

    nsc.configure(
        instance.api,
        instance.target,
        hostname,
        broker_id,
        config
    );

    process.exit(0);
}

/**
 * sets the log level for pino
 * @arg {Object} options from command line/environment/default
 * @returns {Undefined} nothing
 */
function setLogLevel(options) {
    const log_level = options.logLevel || process.env.NAD_LOG_LEVEL;

    if (log_level) {
        if (/^(trace|debug|info|warn|error|fatal)$/.test(log_level)) {
            instance.logger.level = log_level;
            log.level = log_level;
            log.info({ level: log.level }, 'set log level');
        } else {
            const msg = 'invalid log level';

            log.fatal({ level: log_level }, msg);
            configError(`${msg} '${log_level}'`);
        }
    }
    if (options.debug) {
        instance.logger.level = 'debug';
        log.level = 'debug';
        log.info({ level: log.level }, 'set log level');
    }
    if (options.trace) {
        instance.logger.level = 'trace';
        log.level = 'trace';
        log.info({ level: log.level }, 'set log level');
    }
}

/**
 * sets the plugin directory
 * @arg {Object} options from command line/environment/default
 * @returns {Undefined} nothing
 */
function setPluginDirectory(options) {
    let dir = instance.plugin_dir;

    if (options.pluginDir) {
        dir = options.pluginDir;
    } else if (process.env.NAD_PLUGIN_DIR) {
        dir = process.env.NAD_PLUGIN_DIR;
    } else if (options.c) {
        const msg = '-c is deprecated use --plugin-dir';

        log.warn(msg);
        console.warn(instance.pfx_warn, msg);

        dir = options.c;
    }

    try {
        instance.plugin_dir = fs.realpathSync(dir);
    } catch (err) {
        const msg = 'invalid plugin dir';

        log.fatal({ dir, err: err.message }, msg);
        configError(`${msg} '${dir}' - ${err}`);
    }
}

/**
 * sets the uid and gid for dropping privileges
 * @arg {Object} options from command line/environment/default
 * @returns {Undefined} nothing
 */
function setUID(options) {
    const is_posix = process.setuid && process.setgid && process.initgroups;
    const drop_uid = options.uid || process.env.NAD_UID;
    const drop_gid = options.gid || process.env.NAD_GID;

    if (!is_posix) {
        log.debug('not a POSIX system, disabling UID/GID support');
        if (options.uid) {
            log.warn({
                gid : drop_gid,
                uid : drop_uid
            }, 'unable to find POSIX functions required for uid/gid support, disabling');
        }

        return;
    }

    if (!drop_uid || drop_uid === '') {
        instance.drop_uid = 'nobody';
        instance.drop_gid = 'nobody';
        log.debug({
            gid : instance.drop_gid,
            uid : instance.drop_uid
        }, 'setting default uid/gid');

        return;
    }

    if (drop_uid) {
        if (!(/^[a-z_][0-9a-z_]{0,30}$/).test(drop_uid)) {
            const msg = 'invalid uid specified';

            log.fatal({ uid: drop_uid }, msg);
            configError(`${msg} '${drop_uid}'`);
        }
        instance.drop_uid = drop_uid;
        instance.drop_gid = drop_uid;

        if (drop_gid) {
            if (!(/^[a-z_][0-9a-z_]{0,30}$/).test(drop_gid)) {
                const msg = 'invalid gid specified';

                log.fatal({ gid: drop_gid }, msg);
                configError(`${msg} '${drop_gid}'`);
            }
            instance.drop_gid = drop_gid;
        }
    }
}

/**
 * parses a listen specification
 * @arg {String} name of specification from command line/environment/default
 * @arg {String} spec listen specification
 * @returns {Object} parsed address and port
 */
function parseListen(name, spec) {
    let ip = null;
    let port = null;

    if ((/^[0-9]+$/).test(spec)) { // just a port
        port = parseInt(spec, 10);
        log.debug({ port }, 'found port');
    } else if ((/^[0-9]{1,3}(\.[0-9]{1,3}){3}$/).test(spec)) { // just an IP
        ip = spec;
        log.debug({ ip }, 'found ip');
    } else if (spec.indexOf(':') !== -1) { // combo ip:port
        const listen = spec.split(/:/);

        if (listen.length === 2) {
            if (listen[0] !== '') {
                ip = listen[0];
            }
            port = parseInt(listen[1], 10);
        }

        log.debug({ ip, port }, 'found combination');
    }

    if (ip === null && port === null) {
        const msg = `invalid ${name} specification`;

        log.fatal({ arg: spec }, msg);
        configError(`${msg} '${spec}'`);
    }

    if (port <= 0) {
        const msg = `invalid ${name} port`;

        log.fatal({ arg: spec }, msg);
        configError(`${msg} '${spec}'`);
    }

    return { address: ip, port };
}

/**
 * sets the main http listen config
 * @arg {Object} options from command line/environment/default
 * @arg {String} defaultIP address
 * @arg {String} defaultPort number
 * @returns {Undefined} nothing
 */
function setListen(options, defaultIP, defaultPort) {
    let listen = null;

    if (options.listen && options.listen !== '') {
        listen = options.listen;
    } else if (process.env.NAD_LISTEN && process.env.NAD_LISTEN !== '') {
        listen = process.env.NAD_LISTEN;
    } else if (options.p && options.p !== '') {
        const msg = '-p is deprecated use --listen';

        log.warn(msg);
        console.warn(instance.pfx_warn, msg);

        listen = options.p;
    }

    if (!listen) {
        instance.listen.push({
            address : defaultIP,
            port    : defaultPort
        });

        return;
    }

    instance.listen.push(parseListen('listen', listen));
}

/**
 * sets the optional SSL listen credentials into SSL config
 * @arg {Object} options from command line/environment/default
 * @returns {Undefined} nothing
 */
function loadSSLCredentials(options) {
    // load key
    let ssl_key = path.resolve(path.join(nad.base_dir, 'etc', 'na.key'));

    if (options.sslKey) {
        ssl_key = options.sslKey;
    } else if (process.env.NAD_SSL_KEY) {
        ssl_key = process.env.NAD_SSL_KEY;
    } else if (options.sslkey) {
        const msg = '--sslkey is deprecated use --ssl-key';

        log.warn(msg);
        console.warn(instance.pfx_warn, msg);

        ssl_key = options.sslkey;
    }

    try {
        instance.ssl.creds.key = fs.readFileSync(fs.realpathSync(ssl_key));
    } catch (err) {
        const msg = 'invalid SSL key file';

        log.fatal({ err: err.message, ssl_key }, msg);
        configError(`${msg} '${ssl_key}'`);
    }

    // load cert
    let ssl_cert = path.resolve(path.join(nad.base_dir, 'etc', 'na.crt'));

    if (options.sslCert) {
        ssl_cert = options.sslCert;
    } else if (process.env.NAD_SSL_CERT) {
        ssl_cert = process.env.NAD_SSL_CERT;
    } else if (options.sslcert) {
        const msg = '--sslcert is deprecated use --ssl-cert';

        log.warn(msg);
        console.warn(instance.pfx_warn, msg);

        ssl_cert = options.sslcert;
    }

    try {
        instance.ssl.creds.cert = fs.readFileSync(fs.realpathSync(ssl_cert));
    } catch (err) {
        const msg = 'invalid SSL cert file';

        log.fatal({ err: err.message, ssl_cert }, msg);
        configError(`${msg} '${ssl_cert}'`);
    }

    // load ca (if applicable)
    if (instance.ssl.verify) {
        let ssl_ca = path.resolve(path.join(nad.base_dir, 'etc', 'na.ca'));

        if (options.sslCa) {
            ssl_ca = options.sslCa;
        } else if (process.env.NAD_SSL_CA) {
            ssl_ca = process.env.NAD_SSL_CA;
        } else if (options.sslca) {
            const msg = '--sslca is deprecated use --ssl-ca';

            log.warn(msg);
            console.warn(instance.pfx_warn, msg);

            ssl_ca = options.sslca;
        }

        try {
            instance.ssl.creds.ca = fs.readFileSync(fs.realpathSync(ssl_ca));
        } catch (err) {
            const msg = 'invalid SSL CA file';

            log.fatal({ err: err.message, ssl_ca }, msg);
            configError(`${msg} '${ssl_ca}'`);
        }
    }
}

/**
 * sets the optional SSL listen config
 * @arg {Object} options from command line/environment/default
 * @returns {Undefined} nothing
 */
function setSSLOptions(options) {
    let listen = null;

    if (options.sslListen && options.sslListen !== '') {
        listen = options.sslListen;
    } else if (process.env.NAD_SSL_LISTEN && process.env.NAD_SSL_LISTEN !== '') {
        listen = process.env.NAD_SSL_LISTEN;
    } else if (options.s && options.s !== '') {
        const msg = '-s is deprecated use --ssl-listen';

        log.warn(msg);
        console.warn(instance.pfx_warn, msg);

        listen = options.s;
    }

    if (!listen) {
        // just ignore it, ssl is optional
        return;
    }

    instance.ssl.listen.push(parseListen('SSL listen', listen));
    instance.ssl.verify = false;

    if (typeof options.sslVerify === 'boolean') {
        instance.ssl.verify = options.sslVerify;
    } else if (process.env.NAD_SSL_VERIFY) {
        instance.ssl.verify = process.env.NAD_SSL_VERIFY.toLowerCase() === 'yes';
    } else if (typeof options.v === 'boolean') {
        const msg = '-v is deprecated use --ssl-verify';

        log.warn(msg);
        console.warn(instance.pfx_warn, msg);

        instance.ssl.verify = options.v;
    }

    loadSSLCredentials(options);
}

/**
 * sets the optional reverse connection config
 * @arg {Object} options from command line/environment/default
 * @returns {Undefined} nothing
 */
function setReverseOptions(options) {
    let reverse_enabled = typeof options.reverse === 'boolean' ? options.reverse : false;

    if (!reverse_enabled && process.env.NAD_REVERSE) {
        reverse_enabled = process.env.NAD_REVERSE.toLowerCase() === 'yes';
    }

    if (!reverse_enabled) {
        return;
    }

    instance.reverse.enabled = true;

    let cid = null;

    if (options.cid && options.cid !== '') {
        cid = options.cid;
    } else if (process.env.NAD_REVERSE_CID && process.env.NAD_REVERSE_CID !== '') {
        cid = process.env.NAD_REVERSE_CID;
    }

    if (cid !== null) {
        if ((/^[0-9]+$/).test(cid)) {
            instance.reverse.check_bundle_id = cid;
        } else {
            const msg = 'reverse - invalid check bundle id';

            log.fatal({ cid }, msg);
            configError(`${msg} '${cid}'`);
        }
    }

    if (instance.reverse.check_bundle_id === null) {
        try {
            const cosiCfg = path.resolve(path.join(COSI_DIR, 'registration', 'registration-check-system.json'));
            const cosi = require(cosiCfg);

            instance.reverse.check_bundle_id = cosi._cid.replace('/check_bundle/', '');
        } catch (err) {
            const msg = 'reverse - check bundle id';

            log.error({ err }, msg);
            configError(`${msg} ${err}`);
        }
    }

    // NOTE: for target, environment takes higher precedence than command line as it is explicitly for reverse
    //       and there is no reverse-specific command line parameter (until self-configure is fully deprecated).
    //
    // use target specified via --target or default, override with env setting if available
    instance.reverse.target = instance.target;
    if (process.env.NAD_REVERSE_TARGET && process.env.NAD_REVERSE_TARGET !== '') {
        instance.reverse.target = process.env.NAD_REVERSE_TARGET;
    }
}

/**
 * sets the Circonus API config from the DEPRECATED options
 * @arg {Object} options from command line/environment/default
 * @returns {Undefined} nothing
 */
function setDeprecatedAPIOptions(options) {
    // DEPRECATED options
    if (options.apiverbose) {
        instance.api.debug = true;
    }

    let rebuild_api_url = false;
    const api_url_options = url.parse(instance.api.url);

    if (options.apihost && options.apihost.length > 0) {
        const msg = '--apihost is deprecated use --api-url';

        log.warn(msg);
        console.warn(instance.pfx_warn, msg);
        rebuild_api_url = true;
        api_url_options.host = null;
        api_url_options.hostname = options.apihost;
    }

    if (options.apiport && (/^[0-9]+$/).test(options.apiport)) {
        const msg = '--apiport is deprecated use --api-url';

        log.warn(msg);
        console.warn(instance.pfx_warn, msg);
        rebuild_api_url = true;
        api_url_options.port = options.apiport;
        api_url_options.host = null;
    }

    if (options.apipath && options.apipath.length > 0) {
        const msg = '--apipath is deprecated use --api-url';

        log.warn(msg);
        console.warn(instance.pfx_warn, msg);
        rebuild_api_url = true;
        api_url_options.pathname = options.apipath;
        api_url_options.path = null;
    }

    if (options.apiprotocol && (/^https?$/).test(options.apiprotocol)) {
        const msg = '--apiprotocol is deprecated use --api-url';

        log.warn(msg);
        console.warn(instance.pfx_warn, msg);
        rebuild_api_url = true;
        api_url_options.protocol = options.protocol;
    }

    if (rebuild_api_url) {
        instance.api.url = url.format(api_url_options);
    }
}

/**
 * sets the Circonus API config
 * @arg {Object} options from command line/environment/default
 * @returns {Undefined} nothing
 */
function setAPIOptions(options) {
    let cosi = {};
    let ignore_deprecated_options = false;

    if (options.apiKey && options.apiKey !== '') {
        instance.api.key = options.apiKey;
    } else if (process.env.NAD_API_KEY && process.env.NAD_API_KEY !== '') {
        instance.api.key = process.env.NAD_API_KEY;
    } else if (options.authtoken && options.authtoken !== '') {
        const msg = '--authtoken is deprecated use --api-key';

        log.warn(msg);
        console.warn(instance.pfx_warn, msg);

        instance.api.key = options.authtoken;
    }

    // backfill with api key from cosi if available
    if (!instance.api.key || instance.api.key === '') {
        try {
            const cosiCfg = path.resolve(path.join(COSI_DIR, 'etc', 'cosi.json'));

            cosi = require(cosiCfg);

            instance.api.key = cosi.api_key;
        } catch (err) {
            if (err.code !== 'MODULE_NOT_FOUND') {
                const msg = 'COSI API key';

                console.error(instance.pfx_error, msg, err);
                log.fatal({ err: err.message }, msg);
                process.exit(1);
            }
        }
    }

    if (!instance.api.key || instance.api.key === '') {
        // NO api key provided/found, ignore everything else api related
        return;
    }

    if (!(/^[0-9a-fA-F]{4}(?:[0-9a-fA-F]{4}-){4}[0-9a-fA-F]{12}$/).test(instance.api.key)) {
        const msg = 'invalid API Token key';

        log.fatal({ key: instance.api.key }, msg);
        configError(`${msg} ${instance.api.key}`);
    }

    if (options.apiApp && options.apiApp !== '') {
        instance.api.app = options.apiApp;
    } else if (process.env.NAD_API_APP && process.env.NAD_API_APP !== '') {
        instance.api.app = process.env.NAD_API_APP;
    }

    // NOTE: using --api-url or NAD_API_URL will override all other --api(host,port,path,protocol) options set
    if (options.apiUrl && options.apiUrl !== '') {
        ignore_deprecated_options = true;
        instance.api.url = options.apiUrl;
    } else if (process.env.NAD_API_URL && process.env.NAD_API_URL !== '') {
        ignore_deprecated_options = true;
        instance.api.url = process.env.NAD_API_URL;
    }

    if (ignore_deprecated_options) {
        if (instance.api.url.substr(-1) !== '/') {
            instance.api.url += '/';
        }

        return;
    }

    setDeprecatedAPIOptions(options);

    if (instance.api.url.substr(-1) !== '/') {
        instance.api.url += '/';
    }
}

/**
 * load user-supplied statsd config file
 * @arg {Object} options from command line/environment/default
 * @arg {Number} default_flush_interval ms between flushes
 * @returns {Undefined} nothing
 */
function loadStatsdConfigFile(options, default_flush_interval) {
    // process user supplied config, if any
    let statsd_config_file = null;
    let cfg = {};

    const cfg_fail = (err) => {
        const msg = 'unable to load statsd config';

        log.fatal({
                config_file : statsd_config_file,
                err         : err.message
        }, msg);
        console.error(instance.pfx_error, msg, err);
        process.exit(1);
    };

    // try user supplied config file first, fail if there is any error
    // as, if the user supplied it, it was intended to be used.
    if (options.statsdConfig && options.statsdConfig !== '') {
        statsd_config_file = options.statsdConfig;
    } else if (process.env.NAD_STATSD_CONFIG && process.env.NAD_STATSD_CONFIG !== '') {
        statsd_config_file = process.env.NAD_STATSD_CONFIG;
    }

    if (statsd_config_file !== null) {
        try {
            const file = fs.realpathSync(statsd_config_file);

            cfg = require(file);
        } catch (err) {
            cfg_fail(err);
        }
    }

    // otherwise, try the default config and ignore if not found
    // but, fail on any other errors (e.g. parsing)
    if (statsd_config_file === null) {
        statsd_config_file = DEFAULT_STATSD_CONFIG;
        try {
            const file = fs.realpathSync(statsd_config_file);

            cfg = require(file);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                cfg_fail(err);
            }
        }
    }

    if (cfg.servers && Array.isArray(cfg.servers)) {
        for (const server of cfg.servers) {
            if (!server.server || !(/^(udp|tcp)$/i).test(server.server)) {
                log.warn({ server }, `invalid server config [protocol], ignoring`);
                continue;
            }
            if (!server.address ||
                !(net.isIPv4(server.address) || net.isIPv6(server.address))) {
                log.warn({ server }, `invalid server config [address], ignoring`);
                continue;
            }
            if (!server.port || !(/^\d+$/).test(`${server.port}`)) {
                log.warn({ server }, `invalid server config [port], ignoring`);
                continue;
            }

            instance.statsd.servers.push({
                address      : `${server.address}`,
                address_ipv6 : net.isIPv6(server.address),
                port         : `${server.port}`,
                server       : `${server.server}`
            });
        }
    }

    // add default server if needed
    if (instance.statsd.servers.length === 0) {
        instance.statsd.servers.push({
            address      : '127.0.0.1',
            address_ipv6 : false,
            port         : 8125,
            server       : 'udp'
        });
    }

    // saet defaults and overlay with values from config file (if any)
    // 'active' indicates whether the value _can_ be overriden by the config file
    const defaults = {
        flush_interval: {
            active        : true,
            default_value : default_flush_interval
        },
        force_metric_activation: {
            active        : false,
            default_value : false
        },
        group_check_id: {
            // use an explicit check bundle for the group check
            active        : true,
            default_value : null
        },
        group_counter_op: {
            // operation for group counters (sum|average), default: sum
            active        : true,
            default_value : 'sum'
        },
        group_gauge_op: {
            // operation for group gauges (sum|average), default: average
            active        : true,
            default_value : 'average'
        },
        group_key: {
            // **FIRST** part of the metric name that indicates this is a 'group' metric (the groupKey is removed from the metric name)
            active        : true,
            default_value : 'group.'
        },
        group_set_op: {
            // operation for group sets (sum|average), default: sum
            active        : true,
            default_value : 'sum'
        },
        host_category: {
            // category metrics should be sent to nad as. (e.g. statsd, all metrics will start with "statsd`" in UI)
            active        : true,
            default_value : 'statsd'
        },
        host_check_id: {
            // use an explicit check bundle for the host check (applicable if reverse is not enabled)
            active        : true,
            default_value : null
        },
        host_key: {
            // **FIRST** part of the metric name that indicates this is a 'host' metric (the hostKey is removed from the metric name)
            active        : true,
            default_value : null
        },
        manage_metrics: {
            active        : false,
            default_value : false
        },
        send_process_stats: {
            active        : true,
            default_value : true
        }
    };

    for (const key in defaults) {
        if (!{}.hasOwnProperty.call(defaults, key)) {
            continue;
        }

        // assign default value
        instance.statsd[key] = defaults[key].default_value;

        if (!defaults[key].active) { // meaning, it cannot be overriden by supplied config at this time
            continue;
        }

        // assign value from config file, if the key exists
        if ({}.hasOwnProperty.call(cfg, key)) {
            instance.statsd[key] = cfg[key];
        }
    }
}

/**
 * sets the plugin directory
 * @arg {Object} options from command line/environment/default
 * @returns {Undefined} nothing
 */
function setStatsdOptions(options) {
    if (!options.statsd) {
        return;
    }

    if (process.env.NAD_STATSD && process.env.NAD_STATSD.toLowerCase() === 'no') {
        return;
    }

    const default_flush_interval = 10 * 1000; // 10 seconds

    instance.statsd = {
        app_name           : `${instance.app_name}-statsd`,
        app_version        : `${instance.app_version}`,
        enabled            : true,
        flush_interval     : 10000,
        group_check_id     : null,
        group_counter_op   : 'sum',
        group_gauge_op     : 'average',
        group_key          : null,
        group_set_op       : 'sum',
        host_category      : 'statsd',
        host_check_id      : null,
        host_key           : null,
        send_process_stats : true,
        servers            : [],
        start_time         : Date.now()
    };

    instance.statsd.logger = instance.logger.child({ module: `${instance.statsd.app_name}` });

    if (instance.reverse.enabled) {
        // add the reverse check bundle id, if provided
        // if it wasn't provided, the reverse module will add it if it finds a check
        if (instance.reverse.check_bundle_id) {
            instance.statsd.host_check_id = `${instance.reverse.check_bundle_id}`;
        }
    }

    loadStatsdConfigFile(options, default_flush_interval);

    if (typeof instance.statsd.group_key === 'undefined') {
        instance.statsd.group_key = null;
    }
    if (instance.statsd.group_key && instance.statsd.group_key === '') {
        instance.statsd.group_key = null;
    }

    if (typeof instance.statsd.host_key === 'undefined') {
        instance.statsd.host_key = null;
    }
    if (instance.statsd.host_key && instance.statsd.host_key === '') {
        instance.statsd.host_key = null;
    }

    if (instance.statsd.group_check_id !== null) {
        if (!(/^[0-9]+$/).test(`${instance.statsd.group_check_id}`)) {
            log.fatal({ cid: instance.statsd.group_check_id }, 'invalid group check bundle id');
            configError('invalid group check bundle in statsd config', instance.statsd.group_check_id);
        }
    }

    if (instance.statsd.group_check_id === null) {
        try {
            // add cosi group check information, if it is available
            const cfgFile = fs.realpathSync(path.join(COSI_DIR, 'registration', 'registration-check-group.json'));
            const checkCfg = require(cfgFile);

            instance.statsd.group_check_id = checkCfg._cid.replace('/check_bundle/', '');
        } catch (err) {
            log.debug({
                err   : err.message,
                group : 'disabled',
                host  : 'metrics to NAD.push_receiver'
            }, 'no cosi group check found');
        }
    }

    if (instance.statsd.host_check_id !== null) {
        if (!(/^[0-9]+$/).test(`${instance.statsd.host_check_id}`)) {
            log.fatal({ cid: instance.statsd.host_check_id }, 'invalid host check bundle id');
            configError('invalid host check bundle in statsd config', instance.statsd.host_check_id);
        }
    }

    if (instance.statsd.host_check_id === null) {
        try {
            // add cosi host check information, if it is available
            const cfgFile = fs.realpathSync(path.join(COSI_DIR, 'registration', 'registration-check-system.json'));
            const checkCfg = require(cfgFile);

            instance.statsd.host_check_id = checkCfg._cid.replace('/check_bundle/', '');
        } catch (err) {
            log.debug({ err: err.message }, 'disabling check management');
            // ignore, just send metrics to nad and ensure check management is OFF
            instance.statsd.manage_check_metrics = false;
        }
    }

    // the local push_receiver will be used for:
    //      all metrics prefixed with hostKey
    //      all metrics if no statsd-config supplied
    // push_receiver metric category name
    const pr_mc = instance.statsd.host_category;

    instance.statsd.push_receiver_url = `http://${instance.listen[0].address || '127.0.0.1'}:${instance.listen[0].port}/write/${pr_mc}`;

    if (instance.statsd.flush_interval < default_flush_interval) {
        log.warn({ flush_interval: instance.statsd.flush_interval }, `invalid flush interval, using ${default_flush_interval}`);
        instance.statsd.flush_interval = default_flush_interval;
    }
}

/**
 * parses command line options
 * @returns {Undefined} nothing
 */
function parseCommandLineOptions() {
    const options = require('commander');

    //
    // command line options (parsed by commander)
    //
    options.
        version(instance.version).
        //
        // basic
        option('--plugin-dir <path>', `Plugin directory [${DEFAULT_PLUGIN_DIR}]`).
        option('-p, --listen <ip|port|ip:port>', `Listening IP address and port [${DEFAULT_IP ? `${DEFAULT_IP}:` : ''}${DEFAULT_PORT}]`).
        //
        // reverse
        option('-r, --reverse', `Use reverse connection to broker [false]`).
        option('--cid <cid>', `Check bundle id for reverse connection []`).
        // broker (reverse and statsd)
        option('--broker-ca <file>', `CA file for broker reverse connection and statsd []`).
        //
        // api - used by reverse AND self-configure (until self-config is removed)
        option('--api-key <key>', `Circonus API Token key []`).
        option('--api-app <app>', `Circonus API Token app [${instance.app_name}]`).
        option('--api-url <url>', `Circonus API URL [${DEFAULT_API_URL}]`).
        option('--api-ca <file>', `CA file for API URL []`).
        //
        // self-configure DEPRECATED
        option('--hostname <host>', `Hostname self-configure to use in check and graph names [${instance.target}]`).
        option('--brokerid <id>', `Broker ID for self-configure to use for creating check []`).
        option('--configfile <file>', `File in plugin-dir for self-configure []`).
        //
        // self-configure AND reverse
        option('--target <target>', `Target host [${instance.target}] -- see Target below`).
        //
        // SSL
        option('--ssl-listen <ip|port|ip:port>', `SSL listening IP address and port []`).
        option('--ssl-cert <file>', `SSL certificate PEM file, required for SSL [${DEFAULT_SSL_CERT}]`).
        option('--ssl-key <file>', `SSL certificate key PEM file, required for SSL [${DEFAULT_SSL_KEY}]`).
        option('--ssl-ca <file>', `SSL CA certificate PEM file, required for SSL w/verify [${DEFAULT_SSL_CA}]`).
        option('--ssl-verify', `Enable SSL verification`).
        //
        // statsd
        option('--no-statsd', `Disable builtin StatsD interface`).
        option('--statsd-config <file>', `Config file for builtin StatsD interface []`).
        //
        // miscellaneous
        option('-u, --uid <id>', `User id to drop privileges to on start []`).
        option('--log-level <level>', `Log level (trace|debug|info|warn|error|fatal) [${DEFAULT_LOG_LEVEL}]`).
        option('-d, --debug', `Enable debug logging (verbose) [false]`).
        option('-t, --trace', `Enable trace logging (very verbose) [false]`).
        option('--no-watch', `Disable automatic watches of plugin directory, script files, config files. Send SIGHUP to rescan plugins. [${instance.file_watch}]`).
        //
        // not entirely sure of the value these provide.
        // - returns from plugins could be put into the log at the --trace level rather than a separate directory (the log is machine parseable)
        // - no idea what -i 'inventory' actually accomplishes or its intended purpose
        option('--debugdir', `Create debug files for each plugin and write to this directory []`).
        option('--wipedebugdir', `Wipe debug directory clean before each write [false]`).
        option('-i, --inventory', `Offline inventory`).
        //
        // backwards compatibility DEPRECATED arguments
        option('-c <path>', `${chalk.yellow('DEPRECATED')} use ${chalk.bold('--plugin-dir')}`).
        option('-p <spec>', `${chalk.yellow('DEPRECATED')} use ${chalk.bold('--listen')}`).
        option('-s <spec>', `${chalk.yellow('DEPRECATED')} use ${chalk.bold('--ssl-listen')}`).
        option('-v', `${chalk.yellow('DEPRECATED')} use ${chalk.bold('--ssl-verify')}`).
        option('--authtoken <token>', `${chalk.yellow('DEPRECATED')} use ${chalk.bold('--api-key')}`).
        option('--apihost <host>', `${chalk.yellow('DEPRECATED')} use ${chalk.bold('--api-url')}`).
        option('--apiport <port>', `${chalk.yellow('DEPRECATED')} ${chalk.bold('--api-url')}`).
        option('--apipath <path>', `${chalk.yellow('DEPRECATED')} ${chalk.bold('--api-url')}`).
        option('--apiprotocol <proto>', `${chalk.yellow('DEPRECATED')} ${chalk.bold('--api-url')}`).
        option('--apiverbose', `${chalk.yellow('DEPRECATED')} NOP, see ${chalk.bold('--debug')}`).
        option('--sslcert <file>', `${chalk.yellow('DEPRECATED')} use ${chalk.bold('--ssl-cert')}`).
        option('--sslkey <file>', `${chalk.yellow('DEPRECATED')} use ${chalk.bold('--ssl-key')}`).
        option('--sslca <file>', `${chalk.yellow('DEPRECATED')} use ${chalk.bold('--ssl-ca')}`).
        option('--cafile <file>', `${chalk.yellow('DEPRECATED')} use ${chalk.bold('--broker-ca')}`).
        on('--help', helpDetails).
        parse(process.argv);


    // will be used to backfill reverse.target if one not explicitly specified in environment
    if (options.target && options.target !== '') {
        instance.target = options.target;
    }

    // call private functions to configure settings
    // NOTE: these are in a specific order - leave them that way!!
    setLogLevel(options); // all the others depend on a valid log config
    setPluginDirectory(options);
    setListen(options, DEFAULT_IP, DEFAULT_PORT);
    setSSLOptions(options);
    setAPIOptions(options);
    setReverseOptions(options); // depends on api options being set first
    setUID(options);
    setStatsdOptions(options);

    instance.file_watch = options.watch;

    instance.broker_ca_file = null;
    if (options.brokerCa) {
        instance.broker_ca_file = options.brokerCa;
    } else if (process.env.NAD_REVERSE_BROKER_CA) {
        instance.broker_ca_file = process.env.NAD_REVERSE_BROKER_CA;
    } else if (options.cafile) {
        const msg = '--cafile is deprecated use --broker-ca';

        log.warn(msg);
        console.warn(instance.pfx_warn, msg);

        instance.broker_ca_file = options.cafile;
    }

    // debug plugin output
    if (options.debugdir) {
        instance.debug_dir = fs.realpathSync(options.debugdir);
        if (options.wipedebugdir) {
            instance.wipe_debug_dir = true;
        }
    }

    // validate listening config
    if (instance.listen.length === 0 && instance.ssl.listen.length === 0) {
        const msg = 'must specify at least one of --listen or --ssl-listen';

        log.fatal(msg);
        configError(msg);
    }

    //
    // perform any options which will result in exiting (e.g. inventory and self-configure)
    //
    if (options.inventory) {
        let inventory = null;

        try {
            inventory = require(path.join(nad.lib_dir, 'inventory'));
        } catch (err) {
            const msg = 'unable to load inventory module';

            console.error(instance.pfx_error, msg, err);
            log.fatal({ err: err.message }, msg);
            process.exit(1);
        }

        inventory(instance.plugin_dir);
        process.exit(0);
    }

    // if api key was specified and not reverse, assume it's a self-configuration attempt
    // NOTE: use options.apiKey to determine if it was passed, not this.api.key (which is
    //       backfilled with cosi's key - in cases where cosi is available, this.api.key
    //       will *always* be set.)
    if (options.apiKey && !options.reverse) {
        configure_circonus(options);
        process.exit(0);
    }

    return options;
}

class Settings {

    /**
     * initializes the settings object
     */
    constructor() {
        if (instance !== null) {
            return instance;
        }

        instance = this; // eslint-disable-line consistent-this

        // would normally use package.json but nad is oddly installed
        this.app_name = pkg.name;
        this.app_version = pkg.version;
        this.start_time = Date.now();

        this.logger = pino({
            enabled : true,
            level   : DEFAULT_LOG_LEVEL,
            name    : this.app_name
        });
        log = this.logger.child({ module: 'settings' });

        this.pfx_error = chalk.red('ERROR:');
        this.pfx_warn = chalk.yellow('WARN:');

        this.plugin_dir = DEFAULT_PLUGIN_DIR; // directory where plugins are located
        this.is_windows = process.platform === 'win32'; // is running system windows
        this.drop_uid = 0; // drop privileges to UID, if supported and specified on command line
        this.reverse = {
            check_bundle_id : null,
            enabled         : false,
            target          : null
        };
        this.target = os.hostname(); // used by self-configure
        this.api = { // used by self-configure and reverse connection
            app : this.app_name,
            key : null,
            url : DEFAULT_API_URL
        };
        this.debug_dir = null; // if set, a dir to write debug logs to
        this.wipe_debug_dir = false; // if true, wipe debug logs clean before each write
        this.ssl = {// ssl server options
            creds  : {}, // ssl credentials
            listen : [], // server listening address(es)/port(s)
            verify : false // use ca certificate for verifications
        };
        this.statsd = {
            app_name : `${this.app_name}-statsd`,
            config   : null,
            enabled  : false
        };
        this.listen = []; // server listening address(es)/port(s)
        this.send_nad_stats = true; // send nad stats (cpu, memory, uptime)

        this.file_watch = true; // watch plugin dir, plugin scripts and plugin configs. (if false, user can send SIGHUP to trigger rescan)

        parseCommandLineOptions();

        return instance;
    }

}

module.exports = new Settings();
