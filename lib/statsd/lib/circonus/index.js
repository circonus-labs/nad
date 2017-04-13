'use strict';

/* eslint-disable guard-for-in */
/* eslint-disable complexity */

const path = require('path');

const nad = require('nad');
const settings = require(path.join(nad.lib_dir, 'settings'));
const log = settings.statsd.logger.child({ submodule: 'circonus' });
const Trap = require(path.join(__dirname, 'trap'));

let instance = null;

function getMetricDest(name) {
    if (settings.statsd.group_key === null && settings.statsd.host_key === null) {
        return 'host';
    }

    if (settings.statsd.group_key !== null && name.startsWith(settings.statsd.group_key)) {
        return 'group';
    }

    if (settings.statsd.host_key !== null && name.startsWith(settings.statsd.host_key)) {
        return 'host';
    }

    return null;
}

function removeDestFromName(name, dest) {
    if (dest === 'group' && name.startsWith(settings.statsd.group_key)) {
        return name.substr(settings.statsd.group_key.length);
    }

    if (dest === 'host' && name.startsWith(settings.statsd.host_key)) {
        return name.substr(settings.statsd.host_key.length);
    }

    return name;
}

module.exports = class Circonus {

    constructor(events) {
        if (instance !== null) {
            return instance;
        }

        instance = this; // eslint-disable-line consistent-this

        this.enabled = false;

        this.eventManager = events;

        this.checks = {
            group: null,
            host: null
        };

        this.stats = {
            group: {
                flush_length: 0,
                flush_time: 0,
                last_exception: settings.statsd.start_time,
                last_flush: settings.statsd.start_time
            },
            host: {
                flush_length: 0,
                flush_time: 0,
                last_exception: settings.statsd.start_time,
                last_flush: settings.statsd.start_time
            }
        };

        return instance;
    }

    // start sets up the check instances in the Circonus class
    start() {
        const self = this;
        let numErrors = 0;

        this.checks.group = new Trap('group');
        this.checks.host = new Trap('host');

        return new Promise((resolve, reject) => {
            self.checks.group.initialize().
                then((ok) => {
                    if (!ok) {
                        numErrors += 1;
                    }
                    return self.checks.host.initialize('host');
                }).
                then((ok) => {
                    if (!ok) {
                        numErrors += 1;
                    }
                }).
                then(() => {
                    if (numErrors === 2) {
                        log.warn(`no 'host' or 'group' checks found, disabling ${settings.statsd.app_name}`);
                        reject(new Error('no host or group checks available'));
                        return;
                    }
                    self.enabled = true;
                    self.eventManager.on('flush', self.flushMetrics);
                    log.info({ enabled: self.enabled }, 'started');
                    resolve();
                }).
                catch((err) => {
                    log.error({ err: err.message }, 'starting circonus backend');
                });
        });
    }

    // flushMetrics resopnds to the 'flush' event to start a submission to circonus
    flushMetrics(calc_start, metrics_to_flush) {
        const self = instance; // eslint-disable-line consistent-this
        const counters = metrics_to_flush.counters;
        const gauges = metrics_to_flush.gauges;
        const histograms = metrics_to_flush.histograms;
        const sets = metrics_to_flush.sets;
        const text = metrics_to_flush.text;
        const timers = metrics_to_flush.timers;
        const statsd_stats = metrics_to_flush.stats;
        const metrics = {
            host: {},
            group: {}
        };

        log.debug('flush metrics');

        for (const key in counters) {
            let metricName = key;
            const metricDest = getMetricDest(metricName);

            if (metricDest === null) {
                continue;
            }

            metricName = removeDestFromName(metricName, metricDest);

            const metric = {
                _type: 'n',
                _value: counters[key]
            };

            if (metricDest === 'group') {
                metric._fl = '+'; // defaut: sum
                if (settings.statsd.group_counter_op && settings.statsd.group_counter_op === 'average') {
                    metric._fl = '~'; // average
                }
            }

            metrics[metricDest][metricName] = metric;
        }

        for (const key in gauges) {
            let metricName = key;
            const metricDest = getMetricDest(metricName);

            if (metricDest === null) {
                continue;
            }

            metricName = removeDestFromName(metricName, metricDest);

            const metric = {
                _type: 'n',
                _value: gauges[key]
            };

            if (metricDest === 'group') {
                metric._fl = '~'; // default: average
                if (settings.statsd.group_gauge_op && settings.statsd.group_gauge_op === 'sum') {
                    metric._fl = '+'; // sum
                }
            }

            metrics[metricDest][metricName] = metric;
        }

        for (const key in histograms) {
            let metricName = key;
            const metricDest = getMetricDest(metricName);

            if (metricDest === null) {
                continue;
            }

            metricName = removeDestFromName(metricName, metricDest);

            const metric = {
                _type: 'i',
                _value: histograms[key]
            };

            metrics[metricDest][metricName] = metric;
        }

        for (const key in sets) {
            let metricName = key;
            const metricDest = getMetricDest(metricName);

            if (metricDest === null) {
                continue;
            }

            metricName = removeDestFromName(metricName, metricDest);

            const metric = {
                _type: 'n',
                _value: sets[key]
            };

            if (metricDest === 'group') {
                metric._fl = '+'; // default: sum
                if (settings.statsd.group_set_op && settings.statsd.group_set_op === 'average') {
                    metric._fl = '~'; // average
                }
            }

            metrics[metricDest][metricName] = metric;
        }

        for (const key in text) {
            let metricName = key;
            const metricDest = getMetricDest(metricName);

            if (metricDest === null) {
                continue;
            }

            metricName = removeDestFromName(metricName, metricDest);

            const metric = {
                _type: 's',
                _value: text[key]
            };

            metrics[metricDest][metricName] = metric;
        }

        for (const key in timers) {
            let metricName = key;
            const metricDest = getMetricDest(metricName);

            if (metricDest === null) {
                continue;
            }

            metricName = removeDestFromName(metricName, metricDest);

            const metric = {
                _type: 'i',
                _value: timers[key]
            };

            metrics[metricDest][metricName] = metric;
        }

        if (settings.statsd.send_process_stats) {
            // short-term async tasks (socket.write, console.log, etc.)
            metrics.host.open_req_count = {
                _type: 'n',
                _value: process._getActiveRequests().length
            };

            // long-term async tasks (open sockets, timers, etc.)
            metrics.host.open_handle_count = {
                _type: 'n',
                _value:process._getActiveHandles().length
            };

            // run time, seconds
            metrics.host.uptime_seconds = {
                _type: 'n',
                _value:process.uptime()
            };
        }

        for (const key in statsd_stats) {
            metrics.host[key] = {
                _type: 'n',
                _value: key === 'last_packet_seen' ? Math.floor(statsd_stats[key]) / 1000 : statsd_stats[key]
            };
        }

        if (self.checks.group.enabled) {
            const groupLastFlush = self.stats.group.lastFlush || 0;

            metrics.host.group_last_flush = {
                _type: 'n',
                _value: groupLastFlush > 0 ? Math.floor(groupLastFlush / 1000) : groupLastFlush
            };

            const groupLastException = self.stats.group.lastException || 0;

            metrics.host.group_last_exception = {
                _type: 'n',
                _value: groupLastException > 0 ? Math.floor(groupLastException / 1000) : groupLastException
            };

            metrics.host.group_flush_time_ms = {
                _type: 'n',
                _value: self.stats.group.flushTime || 0
            };

            metrics.host.group_flush_length_bytes = {
                _type: 'n',
                _value: self.stats.group.flushLength || 0
            };

            metrics.host.group_num_stats = {
                _type: 'n',
                _value: Object.keys(metrics.group).length
            };
        }

        const hostLastFlush = self.stats.host.lastFlush || 0;

        metrics.host.host_last_flush = {
            _type: 'n',
            _value: hostLastFlush > 0 ? Math.floor(hostLastFlush / 1000) : hostLastFlush
        };

        const hostLastException = self.stats.host.lastException || 0;

        metrics.host.host_last_exception = {
            _type: 'n',
            _value: hostLastException > 0 ? Math.floor(hostLastException / 1000) : hostLastException
        };

        metrics.host.host_flush_time_ms = {
            _type: 'n',
            _value: self.stats.host.flushTime || 0
        };

        metrics.host.host_flush_length_bytes = {
            _type: 'n',
            _value: self.stats.host.flushLength || 0
        };

        const calc_end = process.hrtime(calc_start);

        metrics.host.calculation_time_ms = {
            _type: 'n',
            _value: calc_end[1] / 1000000
        };

        metrics.host.host_num_stats = {
            _type: 'n',
            _value:Object.keys(metrics.host).length + 1 // note: add 1 for this metric as well.
        };

        self._submitGroupMetrics(metrics.group);
        self._submitHostMetrics(metrics.host);
    }

    _submitGroupMetrics(metrics) {
        if (!this.checks.group.enabled) {
            log.debug('group check disabled, skipping submission');
            return;
        }

        if (Object.keys(metrics).length === 0) {
            log.debug('0 group metrics, skipping submission');
            return;
        }

        const startTime = Date.now();
        const self = this;

        log.debug('submit group metrics');
        this.checks.group.submit(metrics).
            then(() => {
                self.stats.group.flushTime = Date.now() - startTime;
                self.stats.group.flushLength = JSON.stringify(metrics).length;
                self.stats.group.lastFlush = Date.now();
            }).
            catch((err) => {
                self.stats.group.lastException = Date.now();
                log.error({ err: err.message }, 'submitting group metrics');
            });
    }

    _submitHostMetrics(metrics) {
        if (!this.checks.host.enabled) {
            log.debug('host check disabled, skipping submission');
            return;
        }

        if (Object.keys(metrics).length === 0) {
            log.debug('0 host metrics, skipping submission');
            return;
        }

        const startTime = Date.now();
        const self = this;

        log.debug('submit host metrics');
        this.checks.host.submit(metrics).
            then(() => {
                self.stats.host.flushTime = Date.now() - startTime;
                self.stats.host.flushLength = JSON.stringify(metrics).length;
                self.stats.host.lastFlush = Date.now();
            }).
            catch((err) => {
                self.stats.host.lastException = Date.now();
                log.error({ err: err.message }, 'submitting host metrics');
            });
    }
};

// END
