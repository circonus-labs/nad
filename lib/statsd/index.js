'use strict';

/* eslint-disable no-process-exit */
/* eslint-disable no-extra-parens */
/* eslint-disable global-require */

const events = require('events');
const path = require('path');

const nad = require('nad');
const settings = require(path.join(nad.lib_dir, 'settings'));
const Circonus = require(path.join(__dirname, 'lib', 'circonus'));
const helpers = require(path.join(__dirname, 'lib', 'helpers'));
const log = settings.statsd.logger;
const backendEvents = new events.EventEmitter();
const stats = {
    bad_lines_seen: 0,
    packets_received: 0,
    metrics_received: 0,
    last_packet_seen: settings.statsd.start_time
};

let circonus = null;
let counters = {};
let gauges = {};
let sets = {};
let text = {};
let timers = {};
let histograms = {};
let old_timestamp = 0;


// getFlushTimeout returns time remaining in flush_interval period
function getFlushTimeout(interval) {
    let timer_interval = interval - ((Date.now() - settings.statsd.start_time) % settings.statsd.flush_interval);

    if (timer_interval < 0) {
        log.warn(`calculated negative flush timer_interval (${timer_interval}), resetting to ${settings.statsd.flush_interval}...`);
        timer_interval = settings.statsd.flush_interval;
    }

    log.debug(`next flush in ${timer_interval}ms`);

    return timer_interval;
}


// startServer loads and starts a protocol server (udp|tcp)
function startServer(cfg, callback) {
    const servermod = require(path.join(__dirname, 'lib', 'servers', cfg.server));

    log.debug(`Loading server ${cfg.server}`);
    if (!servermod.start(cfg, callback)) {
        log.fatal(`Failed to load server: ${cfg.server}`);
        process.exit(1);
    }
}


// resetMetrics deletes/resets metrics based on configuration
function resetMetrics() {
    stats.packets_received = 0;
    stats.metrics_received = 0;
    stats.bad_lines_seen = 0;

    counters = {};
    gauges = {};
    sets = {};
    text = {};
    timers = {};
    histograms = {};
}


// flushMetrics prepares metrics and emits a 'flush' event to backends.
function flushMetrics() {
    const calc_start = process.hrtime();
    const time_stamp = Date.now();

    if (old_timestamp > 0) {
        stats.timestamp_lag_ms = time_stamp - old_timestamp - settings.statsd.flush_interval;
    }

    old_timestamp = time_stamp;

    const metrics = {
        counters,
        gauges,
        sets: {},
        text,
        stats,
        histograms: {},
        timers: {}
    };


    for (const key in timers) { // eslint-disable-line guard-for-in
        metrics.timers[key] = helpers.make_histogram(timers[key]);
    }

    for (const key in histograms) { // eslint-disable-line guard-for-in
        metrics.histograms[key] = helpers.make_histogram(histograms[key]);
    }

    for (const key in sets) { // eslint-disable-line guard-for-in
        metrics.sets[key] = sets[key].size;
    }

    // After all listeners, reset the metrics
    backendEvents.once('flush', resetMetrics);

    backendEvents.emit('flush', calc_start, metrics);

    // Performing this setTimeout at the end of this method rather than the beginning
    // helps ensure we adapt to negative clock skew by letting the method's latency
    // introduce a short delay that should more than compensate.
    setTimeout(flushMetrics, getFlushTimeout(settings.statsd.flush_interval));
}


function handlePacket(msg) { // eslint-disable-line complexity
    stats.packets_received += 1;
    stats.last_packet_seen = Date.now();

    let metrics = null;
    const packet_data = msg.toString();

    if (packet_data.indexOf('\n') > -1) {
        metrics = packet_data.split('\n');
    } else {
        metrics = [ packet_data ];
    }

    for (const midx in metrics) {
        if (metrics[midx].length === 0) {
            continue;
        }

        stats.metrics_received += 1;

        if (log.level === 'trace') {
            log.trace(metrics[midx].toString());
        }

        const bits = metrics[midx].toString().split(':');
        const key = helpers.sanitize_key(bits.shift());

        if (bits.length === 0) {
            bits.push('1');
        }

        for (let i = 0; i < bits.length; i++) {
            let sampleRate = 1;
            const fields = bits[i].split('|');

            if (!helpers.is_valid_packet(fields)) {
                log.warn(`Bad line: ${fields} in msg "${metrics[midx]}"`);
                stats.bad_lines_seen += 1;
                continue;
            }

            if (fields[2]) {
                sampleRate = Number(fields[2].match(/^@([\d.]+)/)[1]);
            }

            const metric_type = fields[1].trim();

            if (metric_type === 'ms') {
                if (!timers[key]) {
                    timers[key] = [];
                }
                timers[key].push(Number(fields[0] || 0));
            } else if (metric_type === 'h') {
                if (!histograms[key]) {
                    histograms[key] = [];
                }
                histograms[key].push(Number(fields[0] || 0));
            } else if (metric_type === 'g') {
                if (gauges[key] && (/^[-+]/).test(fields[0])) {
                    gauges[key] += Number(fields[0] || 0);
                } else {
                    gauges[key] = Number(fields[0] || 0);
                }
            } else if (metric_type === 's') {
                if (!sets[key]) {
                    sets[key] = new Set();
                }
                sets[key].add(fields[0] || '0');
            } else if (metric_type === 't') {
                text[key] = fields[0];
            } else if (metric_type === 'c') {
                if (!counters[key]) {
                    counters[key] = 0;
                }
                counters[key] += Number(fields[0] || 1) * (1 / sampleRate);
            } else {
                log.warn(`Unrecognized metric type '${metric_type}' in '${metrics[midx].toString()}'`);
            }
        }
    }
}

module.exports.start = () => {
    // load circonus metrics transmitter
    circonus = new Circonus(backendEvents);
    circonus.start().
        then(() => {
            // flush metrics on exit
            process.on('exit', () => {
                flushMetrics();
            });

            // Setup the flush timer
            setTimeout(flushMetrics, settings.statsd.flush_interval);

            try {
                // start the listener(s)
                for (let i = 0; i < settings.statsd.servers.length; i++) {
                    startServer(settings.statsd.servers[i], handlePacket);
                }
            } catch (err) {
                log.fatal({ err: err.message }, 'starting statsd server');
                process.exit(1);
            }

            log.info('listener up');
        }).
        catch((err) => {
            log.error({ err: err.message }, 'backend initialization failed, disabling statsd');
        });
};
