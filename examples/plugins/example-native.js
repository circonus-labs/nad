'use strict';

//
// Example of a native plugin. It emits two metrics:
// - `now` with the current time stamp, and
// - `rand` with a random number.
//

/* eslint max-params: ["error", 5] */
/* eslint no-param-reassign: ["error", { "props": false }]*/
/* eslint-disable require-jsdoc, class-methods-use-this, no-unused-vars */

module.exports = class MyPlugin {

    run(plugin_ref, cb, req, plugin_args, plugin_instance) {
        // gather metrics
        const metrics = {
            now  : Date.now(),
            rand : Math.random()
        };

        // indicate the plugin is no longer running
        plugin_ref.running = false;

        // callback with metrics
        cb(plugin_ref, metrics, plugin_instance);
    }

};
