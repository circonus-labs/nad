'use strict';

/* eslint-env node, es6 */
/* eslint-disable global-require  */

const path = require('path');
const child = require('child_process');

class CephOSDPool {
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
        this.ceph_cmd = 'osd';
        this.ceph_cmd_args = 'pool stats';
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
        const cmd = `${this.ceph_bin} ${this.ceph_cmd} ${this.ceph_cmd_args} -f json 2>/dev/null`;

        this._runCommand(cmd, (err, result) => {
            if (err !== null) {
                cb(err);
                return;
            }

            for (const pool of result) {
                metrics[pool.pool_name] = {};
                metrics[pool.pool_name].read_ops_sec = pool.client_io_rate.read_op_per_sec || 0;
                metrics[pool.pool_name].write_ops_sec = pool.client_io_rate.write_op_per_sec || 0;
                metrics[pool.pool_name].read_bytes_sec = pool.client_io_rate.read_bytes_sec || 0;
                metrics[pool.pool_name].write_bytes_sec = pool.client_io_rate.write_bytes_sec || 0;
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

module.exports = CephOSDPool;

if (!module.parent) {
	const ceph = new CephOSDPool();
	ceph.probe((err, metrics) => {
        if (err !== null) {
            throw err;
        }
        console.dir(metrics);
    });
}
