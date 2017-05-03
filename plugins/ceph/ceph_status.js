// Copyright 2016 Circonus, Inc. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

'use strict';

const path = require('path');
const child = require('child_process');

class CephStatus {

    /**
     * creates instances
     */
    constructor() {
        this.config = {};

        try {
            this.config = require(path.resolve(path.join(__dirname, '..', '..', 'ceph.json'))); // eslint-disable-line global-require
        } catch (err) {
            if (err.code !== 'MODULE_NOT_FOUND') {
                console.error(err);

                return;
            }
        }

        this.ceph_bin = this.config.ceph_bin || '/usr/bin/ceph';
        this.ceph_cmd = 'status';
        this.ceph_cmd_args = '';
    }

    /**
     * called by nad to run the plugin
     * @arg {Object} plugin definition
     * @arg {Function} cb callback
     * @arg {Object} req http request object
     * @arg {Object} args instance arguments
     * @arg {String} instance id
     * @returns {Undefined} nothing
     */
    run(plugin, cb, req, args, instance) { // eslint-disable-line max-params, no-unused-vars
        this.probe((err, metrics) => {
            if (err !== null) {
                console.error(err);
                plugin.running = false; // eslint-disable-line no-param-reassign
                cb(plugin, { metric_collection_error: err.message });

                return;
            }
            plugin.running = false; // eslint-disable-line no-param-reassign
            cb(plugin, metrics, instance);
        });
    }

    /**
     * called to start the command
     * @arg {Function} cb callback
     * @returns {Undefined} nothing
     *
     * cb called with err|null, metrics
     */
    probe(cb) {
        const metrics = {};
        const cmd = `${this.ceph_bin} ${this.ceph_cmd} ${this.ceph_cmd_args} -f json`;

        this._runCommand(cmd, (err, result) => {
            if (err !== null) {
                cb(err);

                return;
            }

            metrics.health = 'UNAVAILABLE';

            if ({}.hasOwnProperty.call(result, 'health')) {
                metrics.health = (result.health.overall_status || 'HEALTH_UNKNOWN').replace('HEALTH_', '');
            }

            if ({}.hasOwnProperty.call(result, 'osdmap') && {}.hasOwnProperty.call(result.osdmap, 'osdmap')) {
                metrics.osd = {};
                metrics.osd.total = result.osdmap.osdmap.num_osds;
                metrics.osd.in = result.osdmap.osdmap.num_in_osds;
                metrics.osd.up = result.osdmap.osdmap.num_up_osds;
                metrics.osd.remapped_pgs = result.osdmap.osdmap.num_remapped_pgs;
            }

            if ({}.hasOwnProperty.call(result, 'pgmap')) {
                metrics.pgs = {};
                metrics.pgs.total_bytes = result.pgmap.bytes_total;
                metrics.pgs.avail_bytes = result.pgmap.bytes_avail;
                metrics.pgs.used_bytes = result.pgmap.bytes_used;
                metrics.pgs.data_bytes = result.pgmap.data_bytes;
                metrics.pgs.total = result.pgmap.num_pgs;
                if ({}.hasOwnProperty.call(result.pgmap, 'pgs_by_state')) {
                    for (const state of result.pgmap.pgs_by_state) {
                        metrics.pgs[state.state_name.replace('+', '_')] = state.count;
                    }
                }
            }

            if ({}.hasOwnProperty.call(result, 'quorum')) {
                metrics.quorum = {};
                metrics.quorum.size = result.quorum.length;
                if ({}.hasOwnProperty.call(result, 'monmap') && {}.hasOwnProperty.call(result.monmap, 'mons')) {
                    metrics.quorum.mons = result.monmap.mons.length;
                }
            }

            cb(null, metrics);
        });
    }

    /**
     * runs the command
     * @arg {String} cmd to run
     * @arg {Function} cb callback
     * @returns {Undefined} nothing
     *
     * cb called with err|null, results
     */
    _runCommand(cmd, cb) { // eslint-disable-line class-methods-use-this
        child.exec(cmd, (errExec, stdout, stderr) => {
            if (errExec !== null) {
                cb(new Error(`${errExec} ${stderr}`));

                return;
            }

            let result = null;

            try {
                result = JSON.parse(stdout);
            } catch (errParse) {
                cb(errParse);

                return;
            }

            cb(null, result);
        });
    }

}

module.exports = CephStatus;

if (!module.parent) {
    const ceph = new CephStatus();

    ceph.probe((err, metrics) => {
        if (err !== null) {
            throw err;
        }
        console.dir(metrics);
    });
}
