'use strict';

/* eslint-env node, es6 */
/* eslint-disable global-require, max-params, id-length, no-param-reassign */

const path = require('path');

const Stats = require(path.resolve(path.join(__dirname, 'lib', 'stats')));

class DockerStats {
    constructor() {
        this.config = null;

        try {
            this.config = require(path.resolve(path.join(__dirname, '..', '..', 'docker.json')));
        } catch (err) {
            if (err.code !== 'MODULE_NOT_FOUND') {
                console.error(err);
                return;
            }
        }
    }

    run(d, cb, req, args, instance) {
        const containerStats = new Stats(this.config);

        containerStats.getStats((err, metrics) => {
            if (err) {
                cb(d, { 'docker`api.error': err.message }); // eslint-disable-line callback-return
                d.running = false;
                console.error(err);
                return;
            }

            cb(d, metrics, instance); // eslint-disable-line callback-return
            d.running = false;
            return;
        });
    }
}

module.exports = DockerStats;
