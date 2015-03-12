var path     = require('path'),
    api      = require('circonusapi2'),
    fs       = require('fs'),
    noit     = require('noit');

var broker_hosts = {};
var opts = null;

function establish_tunnels(options) {
    opts = options;

    get_host_info(opts, function(err) {
        if ( err ) return err;

        opts.noit_creds = noit.utils.hashToCreds({
            "key": path.join(opts.configdir, "na.key"),
            "crt": path.join(opts.configdir, "na.crt")
        });

        api.setup(opts.auth_token, 'nad', opts.api_options);
        api.get("/check_bundle", {"f_target": opts.target, "f_type": "json"}, function(code, err, body) {
            if ( err ) {
                console.error("Could not get check bundles from API: [%s] %s", code, err);
                console.error("Cannot establish reverse tunnel.");
                return;
            }

            body.forEach(function(bundle) {
                if ( bundle._checks && bundle.config && bundle.config.port ) {
                    bundle._checks.forEach(function(check) {
                        reverse_tunnel_for_check(check, bundle.config.port);
                    });
                }
            });
        });
    });
}

function get_broker_hostname(brokerid, callback) {
    if ( brokerid in broker_hosts ) {
        if ( broker_hosts[brokerid] == null ) {
            // broker hostname is currently being fetched
            // check back in a few ticks
            setTimeout(get_broker_hostname, 100, brokerid, callback);
            return;
        }
        else {
            return callback(null, broker_hosts[brokerid]);
        }
    }

    broker_hosts[brokerid] = null;
    api.get(brokerid, {}, function(code, err, body) {
        if ( err ) {
            console.error("error fetching broker hostname: %s", err);
            delete broker_hosts[brokerid];
            return callback(err);
        }

        if ( body && body._details && body._details[0].cn ) {
            broker_hosts[brokerid] = body._details[0].cn;
            return callback(null, broker_hosts[brokerid]);
        }
    });
}

function get_host_info(opts, callback) {
    var host_info_file = path.join(opts.configdir, "host_info.json");

    fs.readFile(host_info_file, function(err, data) {
        if ( err ) {
            console.error("Could not read API token from %s. Cannot establish reverse tunnel.", authtokenfile);
            return callback(err);
        }

        config = JSON.parse(data);
        for ( i in config ) {
            opts[i] = config[i];
        }

        return callback(null);
    });
}

function reverse_tunnel_for_check(check_id, port) {
    api.get(check_id, {}, function(code, err, body) {
        if ( err ) {
            console.error("Could not fetch check %s: %s", check_id, err);
            return;
        }

        get_broker_hostname(body._broker, function(err, hostname) {
            if ( err ) {
                console.error("Couldn't get hostname for broker %s: %s", body._broker, err);
                return;
            }

            var proxy = new noit.connection(43191, opts.hostname, opts.noit_creds, hostname);
            proxy.reverse(check_id, "127.0.0.1", port);
        });
    });
}

module.exports = establish_tunnels;
