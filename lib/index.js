// Copyright 2016 Circonus, Inc. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

'use strict';

const fs = require('fs');
const path = require('path');

let instance = null;

class NAD {

    /**
     * create instance
     */
    constructor() {
        if (instance !== null) {
            return instance;
        }

        // NAD modules library directory
        this.lib_dir = fs.realpathSync(__dirname); // eslint-disable-line no-sync

        // installation directory - default:  /opt/circonus  /lib  /node_modules  /nad
        this.base_dir = fs.realpathSync(path.join(__dirname, '..', '..', '..')); // eslint-disable-line no-sync

        instance = this; // eslint-disable-line consistent-this

        return instance;
    }

}

module.exports = new NAD();
