'use strict';

/* eslint-env node, es6 */
/* eslint-disable global-require  */

const path = require('path');
const child = require('child_process');

class CephStatus {
    constructor() {
        this.config = {};

        try {
            this.config = require(path.resolve(path.join(__dirname, '..', '..', 'ceph.json')));
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

    run(d, cb, req, args, instance) {
        this.probe((err, metrics) => {
            if (err !== null) {
                cb(d, { metric_collection_error: err.message });
                d.running = false;
                console.error(err);
                return;
            }
            cb(d, metrics, instance);
            d.running = false;
            return;
        });
    }

    probe(cb) {
        const metrics = {};
        const self = this;
        const cmd = `${this.ceph_bin} ${this.ceph_cmd} ${this.ceph_cmd_args} -f json`;

        this._runCommand(cmd, (err, result) => {
            if (err !== null) {
                cb(err);
                return;
            }

            metrics.health = 'UNAVAILABLE';

            if ({}.hasOwnProperty.call(result, 'health')) {
                metrics.health = (result.health.overall_status || 'HEALTH_UNKNOWN').replace('HEALTH_','');
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

    _runCommand(cmd, cb) {
        child.exec(cmd, (execErr, stdout, stderr) => {
            if (execErr !== null) {
                cb(new Error(`${execErr} ${stderr}`));
                return;
            }

            let result = null;

            try {
                result = JSON.parse(stdout);
            } catch (parseErr) {
                cb(parseErr);
                return;
            }

            cb(null, result);
            return;
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
