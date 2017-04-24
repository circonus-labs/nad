// Copyright 2016 Circonus, Inc. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

'use strict';

const spawn = require('child_process').spawn;
const path = require('path');

const nad = require('nad');
const settings = require(path.join(nad.lib_dir, 'settings'));
const log = settings.logger.child({ plugin: 'ktap' });

/**
 * aggregates samples for a period
 * @arg {Object} tgt target
 * @arg {Object} src source
 * @returns {Undefined} nothing
 */
function __aggr(tgt, src) {
    for (const dev in src) {
        if (!{}.hasOwnProperty.call(tgt, dev)) {
            tgt[dev] = {}; // eslint-disable-line no-param-reassign
        }
        const src_lath = src[dev];
        const tgt_lath = tgt[dev];

        for (const lat in src_lath) {
            if ({}.hasOwnProperty.call(tgt_lath, lat)) {
                tgt_lath[lat] += src_lath[lat];
            } else {
                tgt_lath[lat] = src_lath[lat];
            }
        }
    }
}

/**
 * create histogram from set of samples
 * @arg {Object} lath list of samples to create histogram from
 * @returns {Array} of histograms
 */
function __mklist(lath) {
    const ret = [];

    for (const key in lath) {
        if ({}.hasOwnProperty.call(lath, key)) {
            ret.push(`H[${key}]=${lath[key]}`);
        }
    }

    return ret;
}

module.exports = class da {

    /**
     * initializes class instance
     */
    constructor() {
        this.start();
        this.windows = [];
        for (let i = 0; i < 60; i++) {
            this.windows.push({});
        }
    }

    /**
     * to be overridden - throws if not overridden.
     * see: plugins/linux/io.js
     * @returns {Undefined} nothing
     */
    probe() { // eslint-disable-line class-methods-use-this
        throw Error('abstract method');
    }

    /**
     * starts the ktap process
     * @returns {Undefined} nothing
     */
    start() {
        const self = this;
        const prog = this.probe();

        this.ts = 0;
        this.buff = '';
        this.cmd = spawn('/usr/bin/ktap', [ '-e', prog ]);
        this.cmd.on('exit', () => {
            setTimeout(() => {
                self.start();
            }, 1000);
        });
        this.cmd.stderr.on('data', (buff) => {
            log.error(buff.toString());
        });
        this.cmd.stdout.on('data', (buff) => {
        /* split into lines, keeping leftovers */
            self.buff += buff;
            const lines = self.buff.split('\n');

            if (lines[lines.length - 1] === '') {
                self.buff = '';
            } else {
                self.buff = lines.pop();
            }

            for (let i = 0; i < lines.length; i++) {
                /* parse ts: lines */
                let matches = lines[i].match(/^ts:(\d+)/);

                if (matches !== null) {
                    self.key = null;
                    self.ts = Math.floor(matches[1] / 1000000);
                }

                /* parse key: lines */
                matches = lines[i].match(/^key:(\S+)/);

                if (matches !== null) {
                    self.key = matches[1];
                }

                if (self.ts > 0) {
                    if (self.ts > self.last_idx && self.last_idx > 0) {
                        for (let idx = self.last_idx + 1; idx <= self.ts; idx++) {
                            log.trace({ idx: idx % 60 }, 'clearing');
                            self.windows[idx % 60] = {};
                        }
                    }
                    matches = lines[i].match(/^\s*(\d+)\D+(\d+)/);

                    if (matches !== null) {
                        const val = parseInt(matches[2], 10);

                        if (!{}.hasOwnProperty.call(self.windows[self.ts % 60], 'all')) {
                            self.windows[self.ts % 60].all = {};
                        }
                        if ({}.hasOwnProperty.call(self.windows[self.ts % 60].all, matches[1])) {
                            self.windows[self.ts % 60].all[matches[1]] += val;
                        } else {
                            self.windows[self.ts % 60].all[matches[1]] = val;
                        }
                        if (self.key) {
                            if (!{}.hasOwnProperty.call(self.windows[self.ts % 60], self.key)) { // eslint-disable-line max-depth
                                self.windows[self.ts % 60][self.key] = {};
                            }
                            if ({}.hasOwnProperty.call(self.windows[self.ts % 60][self.key], matches[1])) { // eslint-disable-line max-depth, max-len
                                self.windows[self.ts % 60][self.key][matches[1]] += val;
                            } else {
                                self.windows[self.ts % 60][self.key][matches[1]] = val;
                            }
                        }
                    }
                    self.last_idx = self.ts;
                }
            }
        });

        this.pulse = setInterval(((ref) => {
            return () => {
                const this_idx = Math.floor(Date.now() / 1000);

                if (ref.last_idx > this_idx - 2) {
                    return;
                }
                for (let i = ref.last_idx + 1; i < this_idx; i++) {
                    log.trace({ idx: i % 60 }, 'period clearing');
                    ref.windows[i % 60] = {}; // eslint-disable-line no-param-reassign
                }
                ref.last_idx = this_idx - 1; // eslint-disable-line no-param-reassign
            };
        })(this), 1000);
    }

    /**
     * runs plugins
     * @arg {Object} def plugin definition
     * @arg {Function} cb callback
     * @arg {Object} req http requst object
     * @arg {Object} args instance arguments
     * @arg {String} instance instance id
     * @returns {Undefined} nothing
     */
    run(def, cb, req, args, instance) { // eslint-disable-line max-params, no-unused-vars
        let period = req ? req.headers['x-reconnoiter-period'] : 0;

        if (!period) {
            period = 60000;
        }
        const start_idx = Math.floor(Date.now() / 1000) - Math.floor(period / 1000);
        const agg = {};

        for (let i = start_idx; i <= this.last_idx; i++) {
            __aggr(agg, this.windows[i % 60]);
        }
        const resmon = {};

        for (const key in agg) {
            if ({}.hasOwnProperty.call(agg, key)) {
                resmon[key] = { _type: 'n', _value: __mklist(agg[key]) };
            }
        }
        def.running = false; // eslint-disable-line no-param-reassign
        cb(def, resmon, instance);
    }

};
