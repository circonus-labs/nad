/* eslint-env node, es6 */
/* eslint-disable no-magic-numbers */

'use strict';

const spawn = require('child_process').spawn;

function aggregateSamples(tgt, src) {
    if (src === null) {
        return;
    }

    for (const metric in src) {
        if (!{}.hasOwnProperty.call(tgt, metric)) {
            tgt[metric] = {}; // eslint-disable-line no-param-reassign
        }

        const srcSamples = src[metric];
        const tgtSamples = tgt[metric];

        for (const sample in srcSamples) {
            if (!{}.hasOwnProperty.call(tgtSamples, sample)) {
                tgtSamples[sample] = 0;
            }
            tgtSamples[sample] += srcSamples[sample];
        }
    }
}

function makeHistogram(samples) {
    const ret = [];

    for (const key in samples) { // eslint-disable-line guard-for-in
        ret.push(`H[${key}]=${samples[key]}`);
    }

    return ret;
}

module.exports = class Dtrace {

    constructor(script) {

        if (script === null || typeof script === 'undefined') {
            throw new Error('Script is a required parameter for Dtrace class');
        }

        this.dtracePath = '/usr/sbin/dtrace';
        this.dtrace = null;
        this.script = script;

        // the 'script' is inline if it is not an explicit path
        this.inline = this.script.substr(0, 1) !== '/';

        this.buffer = null;
        this.lines = null;
        this.windows = [];
        this.cleaner = null;

        for (let i = 0; i < 60; i++) {
            this.windows.push(null);
        }
    }

    start() {
        const self = this;

        const dtraceArgs = [ '-q' ];

        if (this.inline) {
            dtraceArgs.push('-n');
        }
        else {
            dtraceArgs.push('-s');
        }

        dtraceArgs.push(this.script);

        this.buffer = '';
        this.dtrace = spawn(this.dtracePath, dtraceArgs);
        this.lines = [];

        this.dtrace.on('exit', (code, signal) => {
            console.error(`${self.script} exited with code ${code} signal ${signal}`);
            setTimeout(() => {
                self.start();
            }, 1000);
        });

        this.dtrace.stderr.on('data', (buff) => {
            console.error(buff.toString());
        });

        this.dtrace.stdout.on('data', (chunk) => {
            self.buffer += chunk;

            /* split into lines, keeping leftovers */

            const buffLines = self.buffer.split('\n');

            if (buffLines[buffLines.length - 1] === '') { // eslint-disable-line no-magic-numbers
                self.buffer = '';
            }
            else {
                self.buffer = buffLines.pop();
            }

            for (let i = 0; i < buffLines.length; i++) {

                const buffLine = buffLines[i].replace(/[\s@]+/g, '');

                if (buffLine.substr(0, 1) !== '>') {
                    self.lines.push(buffLine);
                }
                else if (buffLine.substr(0, 6) === '>START') {
                    self.lines = [];
                }
                else if (buffLine.substr(0, 4) === '>END') {
                    const currTimestamp = Math.floor(new Date() / 1000);
                    let metricKey = null;
                    const metrics = {};

                    if (self.lastTimestamp === null) {
                        self.lastTimestamp = currTimestamp;
                    }
                    if (currTimestamp - self.lastTimestamp >= 60) {
                        for (let j = 0; j < 60; j++) {
                            self.windows[j] = null;
                        }
                    }
                    else {
                        for (let j = self.lastTimestamp + 1; j < currTimestamp; j++) {
                            self.windows[j % 60] = null;
                        }
                    }

                    for (let j = 0; j < self.lines.length; j++) {
                        const line = self.lines[j];
                        let matches = null;

                        matches = line.match(/^=(.+)$/);
                        if (matches !== null) {
                            metricKey = matches[1];
                            continue;
                        }

                        if (metricKey === null || currTimestamp === null) {
                            continue;
                        }

                        matches = line.match(/\d+|\d+/);
                        if (matches !== null) {
                            const aggSample = line.split('|');
                            const latency = aggSample[0]; // used as a object attribute (string)
                            const count = parseInt(aggSample[1], 10);

                            if (count === 0) {
                                continue;
                            }
                            if (!{}.hasOwnProperty.call(metrics, metricKey)) {
                                metrics[metricKey] = {};
                            }
                            metrics[metricKey][latency] = count;
                        }
                    }

                    const windowIdx = currTimestamp % 60;

                    self.windows[windowIdx] = null;
                    if (self.lines.length > 0) {
                        self.windows[windowIdx] = metrics;
                        self.lastTimestamp = currTimestamp;
                    }
                }
            }
        });
    }

    flush(numSamples) {
        const currTimestamp = Math.floor(new Date() / 1000);
        const startTimestamp = currTimestamp - numSamples;
        const aggregates = {};
        const histograms = {};

        for (let i = startTimestamp; i <= this.lastTimestamp; i++) {
            aggregateSamples(aggregates, this.windows[i % 60]);
        }

        for (const key in aggregates) { // eslint-disable-line guard-for-in
            histograms[key] = { // eslint-disable-line quote-props
                '_type': 'n',
                '_value': makeHistogram(aggregates[key])
            };
        }

        return histograms;
    }
};
