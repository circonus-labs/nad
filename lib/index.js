'use strict';

const fs = require('fs');
const path = require('path');

let instance = null;

class NAD {
    constructor() {
        if (instance !== null) {
            return instance;
        }

        // NAD modules library directory
        this.lib_dir = fs.realpathSync(__dirname);

        // installation directory - default:  /opt/circonus  /lib  /node_modules  /nad
        this.base_dir = fs.realpathSync(path.join(__dirname, '..', '..', '..'));

        instance = this; // eslint-disable-line consistent-this

        return instance;
    }
}

module.exports = new NAD();
