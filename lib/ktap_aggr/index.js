'use strict';

/* eslint-disable no-prototype-builtins */
/* eslint-disable no-param-reassign */
/* eslint-disable guard-for-in */

/* eslint max-params: ["error", 5] */

const spawn = require('child_process').spawn;

function __aggr(tgt, src) {
    for (const dev in src) {
        if (!tgt.hasOwnProperty(dev)) {
            tgt[dev] = {};
        }
        const src_lath = src[dev];
        const tgt_lath = tgt[dev];

        for (const lat in src_lath) {
            if (tgt_lath.hasOwnProperty(lat)) {
                tgt_lath[lat] += src_lath[lat];
            } else {
                tgt_lath[lat] = src_lath[lat];
            }
        }
    }
}

function __mklist(lath) {
    const ret = [];

    for (const key in lath) {
        ret.push(`H[${key}]=${lath[key]}`);
    }
    return ret;
}

module.exports = class da {
    constructor() {
        this.start();
        this.windows = [];
        for (let i = 0; i < 60; i++) {
            this.windows.push({});
        }
    }

    probe() {
        throw Error('abstract dtrace aggregator used');
    }

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
            console.log(buff.toString());
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
                            console.log('Clearing ', idx % 60);
                            self.windows[idx % 60] = {};
                        }
                    }
                    matches = lines[i].match(/^\s*(\d+)\D+(\d+)/);

                    if (matches !== null) {
                        const val = parseInt(matches[2], 10);

                        if (!self.windows[self.ts % 60].hasOwnProperty('all')) {
                            self.windows[self.ts % 60].all = {};
                        }
                        if (self.windows[self.ts % 60].all.hasOwnProperty(matches[1])) {
                            self.windows[self.ts % 60].all[matches[1]] += val;
                        } else {
                            self.windows[self.ts % 60].all[matches[1]] = val;
                        }
                        if (self.key) {
                            if (!self.windows[self.ts % 60].hasOwnProperty(self.key)) {
                                self.windows[self.ts % 60][self.key] = {};
                            }
                            if (self.windows[self.ts % 60][self.key].hasOwnProperty(matches[1])) {
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
                const this_idx = Math.floor(Number(new Date()) / 1000);

                if (ref.last_idx > this_idx - 2) {
                    return;
                }
                for (let i = ref.last_idx + 1; i < this_idx; i++) {
                    console.log('period Clearing ', i % 60);
                    ref.windows[i % 60] = {};
                }
                ref.last_idx = this_idx - 1;
            };
        })(this), 1000);
    }

    run(def, cb, req, args, instance) {
        let period = req ? req.headers['x-reconnoiter-period'] : 0;

        if (!period) {
            period = 60000;
        }
        let this_idx = Math.floor(Number(new Date()) / 1000);
        const start_idx = this_idx -= Math.floor(period / 1000);
        const agg = {};

        for (let i = start_idx; i <= this.last_idx; i++) {
            __aggr(agg, this.windows[i % 60]);
        }
        const resmon = {};

        for (const key in agg) {
            resmon[key] = { _type: 'n', _value: __mklist(agg[key]) };
        }
        def.running = false;
        cb(def, resmon, instance);
        return;
    }
};
