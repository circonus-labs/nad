// Copyright 2016 Circonus, Inc. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/* eslint-disable no-sync */

'use strict';

const fs = require('fs');
const path = require('path');

const nad = require('nad');
const da = require(path.join(nad.lib_dir, 'ktap_aggr'));

class IO extends da {

    /**
     * override da probe method
     * @returns {String} script
     */
    probe() { // eslint-disable-line class-methods-use-this
        const dlist = {};
        const dseen = {};
        const devs = fs.readdirSync('/dev');

        for (let i = 0; i < devs.length; i++) {
            const stat = fs.statSync(`/dev/${devs[i]}`);

            if (stat && stat.isBlockDevice()) {
                const major = Math.floor(stat.rdev / 256);

                if (!dseen[stat.rdev] && major * 256 === stat.rdev) {  /* minor == 0 */
                    dseen[stat.rdev] = 1;
                    dlist[devs[i]] = stat.rdev;
                }
            }
        }


        let script = 'var ios = {} \n' +
     'var hist = {} \n';

        for (const dname in dlist) {
            if ({}.hasOwnProperty.call(dlist, dname)) {
                script = `${script}hist[${dlist[dname]}] = {}\n`;
            }
        }
        script = `${script}trace block:block_rq_issue { \n` +
     `  if (arg2 == 0) { return } \n` +
     `  var idx = arg1 * 256 + arg2 \n` +
     `  ios[idx] = gettimeofday_us() \n` +
     `} \n` +
     `trace block:block_rq_complete { \n` +
     `  var dev = 256 * (arg0 / 1048576) + arg0 % 256 \n` +
     `  if (arg2 == 0) { return } \n` +
     `  var idx = arg1 * 256 + arg2 \n` +
     `  if (ios[idx] == nil) { return } \n` +
     `  var delta = (gettimeofday_us() - ios[idx]) \n` +
     `  var te = 0 \n` +
     `  var mult = 1 \n` +
     `  while (delta > 100) { \n` +
     `    delta = delta / 10 \n` +
     `    mult = mult * 10 \n` +
     `  } \n` +
     `  if (hist[dev] != nil) { \n` +
     `    hist[dev][delta*mult] += 1 \n` +
     `  } \n` +
     `  ios[idx] = nil \n` +
     `} \n` +
     ` \n` +
     `tick-1s { \n` +
     `  printf("ts:%d\\n", gettimeofday_us()) \n`;
        for (const dname in dlist) {
            if ({}.hasOwnProperty.call(dlist, dname)) {
                script = `${script}  printf("key:${dname}\\n") \n` +
                           `  print_hist(hist[${dlist[dname]}]) \n` +
                           `  delete(hist[${dlist[dname]}]) \n`;
            }
        }
        script = `${script}}`;

        return script;
    }

}


module.exports = IO;
