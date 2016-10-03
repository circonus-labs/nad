'use strict';

/* eslint-env node, es6 */
/* eslint-disable no-magic-numbers */

const Docker = require('docker-modem');

module.exports = class Stats {
    constructor(opts) {
        this.docker = new Docker(opts);
    }

    getStats(cb) {
        const self = this;
        const metrics = {};

        this._getContainers((err, containers) => {
            if (err) {
                cb(err);
                return;
            }

            if (containers.length === 0) {
                cb(new Error('No Docker containers running.'));
                return;
            }

            for (let i = 0; i < containers.length; i++) {
                const container = containers[i];

                const opts = {
                    path: `/containers/${container.Id}/stats?`,
                    method: 'GET',
                    options: { stream: false },
                    statusCodes: {
                        200: true,
                        404: 'no such container',
                        500: 'server error'
                    }
                };

                const netStats = [
                    'rx_bytes',
                    'rx_packets',
                    'rx_errors',
                    'rx_dropped',
                    'tx_bytes',
                    'tx_packets',
                    'tx_errors',
                    'tx_dropped'
                ];

                const metricPrefix = `${container.Image}\`${container.Names[0].substr(1)}`;

                self.docker.dial(opts, (err2, stats) => {
                    if (err2) {
                        cb(err2);
                        return;
                    }

                    // memory
                    metrics[`${metricPrefix}\`memory\`usage`] = stats.memory_stats.usage;
                    metrics[`${metricPrefix}\`memory\`max_usage`] = stats.memory_stats.max_usage;

                    // cpu
                    metrics[`${metricPrefix}\`cpu\`total`] = stats.cpu_stats.cpu_usage.total_usage;
                    metrics[`${metricPrefix}\`cpu\`kernel`] = stats.cpu_stats.cpu_usage.usage_in_kernelmode;
                    metrics[`${metricPrefix}\`cpu\`user`] = stats.cpu_stats.cpu_usage.usage_in_usermode;

                    // block io
                    const ioStatKeys = Object.keys(stats.blkio_stats);

                    for (let j = 0; j < ioStatKeys.length; j++) {
                        const ioStat = ioStatKeys[j];

                        if ({}.hasOwnProperty.call(stats.blkio_stats, ioStat)) {
                            const stat = stats.blkio_stats[ioStat];

                            for (let k = 0; k < stat.length; k++) {
                                const item = stat[k];

                                metrics[`${metricPrefix}\`${ioStat}\`${item.major}-${item.minor}\`${item.op.toLowerCase()}`] = item.value;
                            }
                        }
                    }

                    // network
                    for (const iface in stats.networks) {
                        if ({}.hasOwnProperty.call(stats.networks, iface)) {
                            const stat = stats.networks[iface];

                            for (const item of netStats) {
                                metrics[`${metricPrefix}\`${iface}\`${item}`] = stat[item];
                            }
                        }
                    }

                    cb(null, metrics);
                });
            }
        });
    }

    _getContainers(cb) {
        const opts = {
            path: '/containers/json?',
            method: 'GET',
            options: { status: 'running' },
            statusCodes: {
                200: true,
                400: 'bad parameter',
                500: 'server error'
            }
        };

        this.docker.dial(opts, (err, data) => {
            if (err) {
                cb(err);
                return;
            }
            cb(null, data);
        });
    }
};
