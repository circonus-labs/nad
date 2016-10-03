/* eslint-env node, es6 */
/* eslint-disable global-require, max-params, id-length, no-param-reassign */

'use strict';

const path = require('path');

const Events = require(path.resolve(path.join(__dirname, 'lib', 'events')));

class DockerEvents {
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
        const containerEvents = new Events(this.config);

        containerEvents.getEvents((err, eventMetrics) => {
            if (err) {
                cb(d, { 'docker`api.error': err.message }); // eslint-disable-line callback-return
                d.running = false;
                console.error(err);
                return;
            }

            cb(d, eventMetrics, instance); // eslint-disable-line callback-return
            d.running = false;
            return;
        });
    }
}

module.exports = DockerEvents;
