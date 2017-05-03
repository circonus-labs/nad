// Copyright 2016 Circonus, Inc. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

'use strict';

const path = require('path');

const Stats = require(path.resolve(path.join(__dirname, 'lib', 'stats')));

class DockerStats {

    /**
     * creates a new instance
     */
    constructor() {
        this.config = null;

        try {
            this.config = require(path.resolve(path.join(__dirname, '..', '..', 'docker.json'))); // eslint-disable-line global-require
        } catch (err) {
            if (err.code !== 'MODULE_NOT_FOUND') {
                console.error(err);
            }
        }
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
        const containerStats = new Stats(this.config);

        containerStats.getStats((err, metrics) => {
            if (err) {
                console.error(err);
                plugin.running = false; // eslint-disable-line no-param-reassign
                cb(plugin, { 'docker`api.error': err.message });

                return;
            }

            plugin.running = false; // eslint-disable-line no-param-reassign
            cb(plugin, metrics, instance);
        });
    }

}

module.exports = DockerStats;
