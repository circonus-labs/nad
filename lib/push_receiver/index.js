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

/* eslint-disable no-param-reassign */

/* eslint max-params: ["error", 5] */

const path = require('path');

const nad = require('nad');
const settings = require(path.join(nad.lib_dir, 'settings'));
const log = settings.logger.child({ module: 'push_receiver' });

function __aggr(tgt, src) {
    for (const key in src) {
        if (!(key in tgt)) {
            tgt[key] = { _type : src[key]._type, _value: [] };
        }
        if (Array.isArray(src[key]._value)) {
            tgt[key]._value = tgt[key]._value.concat(src[key]._value);
        } else {
            tgt[key]._value.push(src[key]._value);
        }
    }
}

module.exports = class PushReceiver {
    constructor() {
        this.set = {};
    }

    run(details, cb, req, args, instance) {
        const metrics = {};

        for (const metric in this.set) {
            if (!{}.hasOwnProperty.call(this.set, metric)) {
                continue;
            }
            const ref = this.set[metric];

            let period = req ? req.headers['x-reconnoiter-period'] : 0;

            if (!period) {
                period = 60000;
            }

            let this_idx = Math.floor(Date.now() / 1000);
            const start_idx = this_idx -= Math.floor(period / 1000);
            const agg_metrics = {};

            for (let i = start_idx; i <= ref.last_idx; i++) {
                __aggr(agg_metrics, ref.windows[i % 60]);
            }

            metrics[metric] = agg_metrics;
        }

        details.running = false;
        cb(details, metrics, instance);
        return;
    }

    store_incoming_data(name, incoming_data) {
        log.debug({ name }, 'received data');
        log.trace({ raw_data: incoming_data.toString() }, 'incoming data');

        if (!(name in this.set)) {
            this.set[name] = {
                last_idx: 0,
                windows: []
            };
            for (let i = 0; i < 60; i++) {
                this.set[name].windows[i] = {};
            }
        }

        const ref = this.set[name];

        /* for each incoming key, save all the data */
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

        log.trace({ name, parsed_data: data, location_idx: this_idx % 60 }, 'storing data');

        ref.windows[this_idx % 60] = data;
        ref.last_idx = this_idx;
    }
};
