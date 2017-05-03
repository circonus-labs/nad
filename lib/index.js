// Copyright 2016 Circonus, Inc. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

'use strict';

const fs = require('fs');
const path = require('path');

/** @private */
let instance = null;

class NAD {

    /**
     * create instance
     * @constructor
     */
    constructor() {
        if (instance !== null) {
            return instance;
        }

        /**
         * NAD installation directory - default: /opt/circonus/nad
         * @public
         */
        this.nad_dir = fs.realpathSync(path.join(__dirname, '..', '..')); // eslint-disable-line no-sync

        /**
         * NAD etc directory
         * @public
         */
        this.etc_dir = fs.realpathSync(path.join(this.nad_dir, 'etc')); // eslint-disable-line no-sync

        /**
         * NAD modules library directory - default: /opt/circonus/nad/node_modules/nad
         * @public
         */
        this.lib_dir = fs.realpathSync(__dirname); // eslint-disable-line no-sync

        /**
         * top level installation directory - default: /opt/circonus
         * @public
         */
        this.base_dir = fs.realpathSync(path.join(__dirname, '..', '..', '..')); // eslint-disable-line no-sync

        instance = this; // eslint-disable-line consistent-this

        return instance;
    }

}

module.exports = new NAD();
