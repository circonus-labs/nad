// Copyright 2016 Circonus, Inc. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/*

Push receiver

NOTE: metrics sent to the push receiver must be well formed JSON, with types and values.

{
  "foo": {
    "_type": "n",
    "_value":1
  },
  "bar": {
    "_type": "n",
    "_value": 2
  }
}

*/

'use strict';

const path = require('path');

const nad = require('nad');
const settings = require(path.join(nad.lib_dir, 'settings'));
const log = settings.logger.child({ module: 'push_receiver' });

/**
 * aggregates samples for a period
 * @arg {Object} tgt target
 * @arg {Object} src source
 * @returns {Undefined} nothing
 */
function __aggr(tgt, src) {
    for (const key in src) {
        if (!{}.hasOwnProperty.call(tgt, key)) {
            tgt[key] = { _type: src[key]._type, _value: [] }; // eslint-disable-line no-param-reassign
        }
        if (Array.isArray(src[key]._value)) {
            tgt[key]._value = tgt[key]._value.concat(src[key]._value); // eslint-disable-line no-param-reassign
        } else {
            tgt[key]._value.push(src[key]._value);
        }
    }
}

module.exports = class PushReceiver {

    /**
     * initialize new instance
     */
    constructor() {
        this.metrics = {};
    }

    /**
     * run plugin
     * @arg {Object} details plugin definition
     * @arg {Function} cb callback
     * @arg {Object} req http request object
     * @arg {Object} args instance arguments
     * @arg {String} instance name/id
     * @returns {Undefined} nothing
     */
    run(details, cb, req, args, instance) { // eslint-disable-line max-params, no-unused-vars
        const metrics = {};

        let period = req ? req.headers['x-reconnoiter-period'] : 0;

        if (!period) {
            period = 60000;
        }

        for (const metric in this.metrics) {
            if (!{}.hasOwnProperty.call(this.metrics, metric)) {
                continue;
            }

            const start_idx = Math.floor(Date.now() / 1000) - Math.floor(period / 1000);
            const agg_metrics = {};

            for (let i = start_idx; i <= this.metrics[metric].last_idx; i++) {
                __aggr(agg_metrics, this.metrics[metric].windows[i % 60]);
            }

            metrics[metric] = agg_metrics;
        }

        details.running = false; // eslint-disable-line no-param-reassign
        cb(details, metrics, instance);
    }

    /**
     * save pushed data
     * @arg {String} name name/id of metric group/category
     * @arg {Buffer} incoming_data raw data in JSON format
     * @returns {Undefined} nothing
     */
    store_incoming_data(name, incoming_data) {
        log.debug({ name }, 'received data');
        log.trace({ raw_data: incoming_data.toString() }, 'incoming data');

        if (!{}.hasOwnProperty.call(this.metrics, name)) {
            this.metrics[name] = {
                last_idx : 0,
                windows  : []
            };
            for (let i = 0; i < 60; i++) {
                this.metrics[name].windows[i] = {};
            }
        }

        const ref = this.metrics[name];
        const this_idx = Math.floor(Date.now() / 1000);

        if (!ref.last_idx) {
            ref.last_idx = this_idx;
        }

        /* everything from last up to now is moot */
        for (let i = ref.last_idx + 1; i < this_idx; i++) {
            ref.windows[i % 60] = {};
        }

        let data = null;

        try {
            data = JSON.parse(incoming_data);
        } catch (err) {
            log.error({ err: err.message }, 'parsing incoming data');

            return;
        }

        log.trace({
            location_idx : this_idx % 60,
            name,
            parsed_data  : data
        }, 'storing data');

        ref.windows[this_idx % 60] = data;
        ref.last_idx = this_idx;
    }

};
