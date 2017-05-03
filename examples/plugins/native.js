'use strict';

/* eslint max-params: ["error", 5] */
/* eslint no-param-reassign: ["error", { "props": false }]*/

module.exports = class MyPlugin {
    run(plugin_ref, cb, req, plugin_args, plugin_instance) {

        // gather metrics
        const metrics = {
            now: Date.now(),
            rand: Math.random()
        };

        // indicate the plugin is no longer running
        plugin_ref.running = false;

        // callback with metrics
        cb(plugin_ref, metrics, plugin_instance);

    }
};
