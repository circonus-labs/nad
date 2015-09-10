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

        try {
            opts.ca_file = path.join(opts.configdir, "na.ca");
            opts.nad_creds = {"ca": fs.readFileSync(opts.ca_file)};
        }
        catch(e) {
            console.error("Could not read CA file from %s: %s", opts.ca_file, opts.nad_creds);
            console.error("Cannot establish reverse tunnel.");
            return;
        }

        api.setup(opts.auth_token, 'nad', opts.api_options);
        api.get("/check_bundle", {"f_target": opts.target, "f_type": "json"}, function(code, err, body) {
            if ( err ) {
                console.error("Could not get check bundles from API: [%s] %s", code, err);
                console.error("Cannot establish reverse tunnel.");
                return;
            }

            body.forEach(function(bundle) {
                if ( bundle._reverse_connection_urls && bundle.config && bundle.config.port ) {
                    bundle._reverse_connection_urls.forEach(function(conn_url, idx) {
                        reverse_tunnel(conn_url, bundle.brokers);
                    });
                }
            });
        });
    });
}

function get_broker_cname(brokerid, callback) {
    if ( brokerid in broker_hosts ) {
        if ( broker_hosts[brokerid] == null ) {
            // broker cname is currently being fetched
            // check back in a few ticks
            setTimeout(get_broker_cname, 100, brokerid, callback);
            return;
        }
        else {
            return callback(null, broker_hosts[brokerid]);
        }
    }

    broker_hosts[brokerid] = null;
    api.get(brokerid, {}, function(code, err, body) {
        if ( err ) {
            console.error("error fetching broker cname: %s", err);
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

function reverse_tunnel(connection_url, brokers) {
    var matches = connection_url.match( /mtev_reverse\:\/\/(.*?)\:(\d+)\/(.*)/ );
    if ( matches.length == 0 ) {
        console.error("Could not parse reverse connection URL: %s", connection_url);
        return;
    }

    var c_host = matches[1], c_port = matches[2], c_path = matches[3];

    brokers.forEach(function(broker_id) {
        get_broker_cname(broker_id, function(err, cname) {
            if ( err ) {
                console.error("Couldn't get cname for broker %s: %s", body._broker, err);
                return;
            }

            [].concat(opts.ports, opts.sslports).forEach(function(port) {
                if ( port ) {
                    if ( port instanceof Array() ) {
                        port = port[0];
                    }

                    var proxy = new noit.connection(c_port, c_host, opts.nad_creds, cname);
                    proxy.reverse(c_path, "127.0.0.1", port);
                }
            });
        });
    });
}

module.exports = establish_tunnels;
