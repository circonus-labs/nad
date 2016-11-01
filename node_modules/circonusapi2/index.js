/**
 * Tiny library for interacting with Circonus' API v2
 *
 * Exported methods
 *  setup:  inital setup function to give the API your auth token an app name
 *  get, post, put, delete: docs for each method below, are proxies for the
 *                          various methods for REST calls
 *
 * Notes:
 *  callback functions take 3 args (code, error, body)
 *    code:   HTTP Response code, if null a non HTTP error occurred
 *    error:  Error message from API, null on 200 responses
 *    body:   Response body, i.e. the thing you probably want
 */

'use strict';

/* eslint-disable */

var qs = require('querystring');
var ProxyAgent = require('https-proxy-agent');
var zlib = require('zlib');

var singleton = null;
var api = null;

// extract proxy setting from environment for a specific protocol
function getProtocolProxyURL(urlProtocol) {
    var proxyServer = null;

    if (urlProtocol === 'http:') {
        if ({}.hasOwnProperty.call(process.env, 'http_proxy')) {
            proxyServer = process.env.http_proxy;
        } else if ({}.hasOwnProperty.call(process.env, 'HTTP_PROXY')) {
            proxyServer = process.env.HTTP_PROXY;
        }
    } else if (urlProtocol === 'https:') {
        if ({}.hasOwnProperty.call(process.env, 'https_proxy')) {
            proxyServer = process.env.https_proxy;
        } else if ({}.hasOwnProperty.call(process.env, 'HTTPS_PROXY')) {
            proxyServer = process.env.HTTPS_PROXY;
        }
    }
    if (proxyServer !== null && proxyServer !== '') {
        if (!(/^http[s]?:\/\//).test(proxyServer)) {
            proxyServer = 'http://' + proxyServer;
        }
    }

    return proxyServer;
}


api = function(token, app, options) {
    var protocol = null;

    options = options || {};
    this.authtoken = token;
    this.appname = app;
    protocol = options.protocol;
    if (typeof protocol === 'string') {
        protocol = (protocol === 'http') ? require('http') : undefined;
    }
    this.protocol = protocol || require('https');
    this.apihost = options.host || 'api.circonus.com';
    this.apiport = options.port || 443;
    this.apipath = options.path || '/v2/';
    this.verbose = options.verbose;

    this.proxyServer = getProtocolProxyURL(this.protocol.globalAgent.protocol);
};

/**
 * GET:
 *
 *  endpoint: (/check_bundle, /check/1, etc.)
 *  data:     object which will be converted to a query string
 *  callback: what do we call when the response from the server is complete,
 *            arguments are callback(code, error, body)
 */
api.prototype.get = function(endpoint, data, callback) {
    var options = this.get_request_options('GET', endpoint, data);
    this.do_request(options, callback);
};


/**
 * POST:
 *
 *  endpoint: specify an object collection (/check_bundle, /graph, etc.)
 *  data:     object which will be stringified to JSON and written to the server
 *  callback: what do we call when the response from the server is complete,
 *            arguments are callback(code, error, body)
 */
api.prototype.post = function(endpoint, data, callback) {
    var options = this.get_request_options('POST', endpoint, data);
    this.do_request(options, callback);
};

/**
 * PUT:
 *
 *  endpoint: specify an exact object (/check_bundle/1, /template/2, etc.)
 *  data:     object which will be stringified to JSON and written to the server
 *  callback: what do we call when the response from the server is complete,
 *            arguments are callback(code, error, body)
 */
api.prototype.put = function(endpoint, data, callback) {
    var options = this.get_request_options('PUT', endpoint, data);
    this.do_request(options, callback);
};

/**
 * DELETE:
 *
 *  endpoint: specify an exact object (/check_bundle/1, /rule_set/1_foo, etc.)
 *  callback: what do we call when the response from the server is complete,
 *            arguments are callback(code, error, body)
 */
api.prototype.delete = function(endpoint, callback) {
    var options = this.get_request_options('DELETE', endpoint);
    this.do_request(options, callback);
};

/**
 * This is called from the various exported functions to actually perform
 * the request.  Will retry up to 5 times in the event we get a connection
 * reset error.
 */
api.prototype.do_request = function(options, callback) {
    var self = this;

    if (self.verbose) {
        console.error(options.method + ' REQUEST:');
    }

    var req = this.protocol.request(options, function(res) {
        var data = [];

        res.on('data', function(chunk) {
            data.push(chunk);
        });

        res.on('end', function() {
            // try again... on rate limit or internal (server-side, hopefully recoverable) error
            if (res.statusCode === 429 || res.statusCode === 500) {
                if (options.circapi.retry < options.circapi.retry_backoff.length) {
                    setTimeout(function() {
                        self.do_request(options, callback);
                    }, options.circapi.retry_backoff[options.circapi.retry]);
                    options.circapi.retry += 1;
                } else {
                    callback(res.statusCode, new Error('Giving up after '+options.circapi.retry+' attempts'), null, null);
                    return;
                }
            }

            // success, no content
            if (res.statusCode === 204) {
                callback(res.statusCode, null, null, null);
                return;
            }

            var buffer = Buffer.concat(data);
            var encoding = res.headers['content-encoding'];
            var err_msg = null;
            var body = null;

            if (data.length === 0) {
                err_msg = new Error('No data returned, 0 length body.');
            } else if (encoding === 'gzip') {
                try {
                    body = zlib.gunzipSync(buffer).toString();
                } catch (gzipErr) {
                    err_msg = gzipErr;
                }
            } else if (encoding === 'deflate') {
                try {
                    body = zlib.deflateSync(buffer).toString();
                } catch (deflateErr) {
                    err_msg = deflateErr;
                }
            } else {
                body = buffer.toString();
            }

            if (self.verbose) {
                console.error('RESPONSE ' + res.statusCode + ':');
                console.error(body);
            }

            if (err_msg !== null) {
                callback(res.statusCode, err_msg, null, body);
                return;
            }

            // If this isn't a 200 level, extract the message from the body
            if (res.statusCode < 200 || res.statusCode > 299) {
                try {
                    err_msg = JSON.parse(body).message;
                } catch (err) {
                    err_msg = 'An error occurred, but the body could not be parsed: ' + err;
                }
                callback(res.statusCode, err_msg, null, body);
                return;
            }

            var parsed = null;

            try {
                if (body) {
                    parsed = JSON.parse(body);
                }
            } catch (parseErr) {
                err_msg = new Error('Error parsing body');
                err_msg.detail = parseErr;
                err_msg.body = body;
            }

            callback(res.statusCode, err_msg, parsed, body);
        });
    });

    req.on('error', function(e) {
        if (e.code === 'ECONNRESET' && options.circapi.retry < options.circapi.retry_backoff.length) {
            // sleep and try again, hopefully a recoverable error
            setTimeout(function() {
                self.do_request(options, callback);
            }, options.circapi.retry_backoff[options.circapi.retry]);
            options.circapi.retry += 1;
        } else {
            callback(null, e.message, null);
        }
    });

    if (options.method.toUpperCase() === 'POST' || options.method.toUpperCase() === 'PUT') {
        var stringified = JSON.stringify(options.circapi.data);
        req.write(stringified);
        if (self.verbose) {
            console.error(stringified);
        }

    }
    req.end();
};

/**
 * Hands back an options object suitable to use with the HTTPS class
 */
api.prototype.get_request_options = function(method, endpoint, data) {
    var options = {
        host: this.apihost,
        port: this.apiport,
        path: this.apipath,
        method: method.toUpperCase(),
        agent: false,
        headers: {
            'X-Circonus-Auth-Token': this.authtoken,
            'X-Circonus-App-Name': this.appname,
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip,deflate'
        },
        circapi: {
            retry: 0,
            retry_backoff: [
                null,       // 0 first attempt
                1 * 1000,   // 1, wait 1 second and try again
                2 * 1000,   // 2, wait 2 seconds and try again
                4 * 1000,   // 3, wait 4 seconds and try again
                8 * 1000,   // 4, wait 8 seconds and try again
                16 * 1000,  // 5, wait 16 seconds and try again
                32 * 1000   // 6, wait 32 seconds and retry again then give up if it fails
            ],
            data: null
        }
    };

    if (this.proxyServer !== null) {
        options.agent = new ProxyAgent(this.proxyServer);
    }

    if ((/^v[46]/).test(process.version)) {

        // currently 2016-10-27T16:01:42Z, these settings seem to be
        // necessary to prevent http/https requests from intermittently
        // emitting an end event prior to all content being received
        // when communicating with the API. at least until the actual
        // root cause can be determined.

        if (!{}.hasOwnProperty.call(options, 'agent') || options.agent === false) {
            options.agent = new this.protocol.Agent();
        }

        options.agent.keepAlive = false;
        options.agent.keepAliveMsecs = 0;
        options.agent.maxSockets = 1;
        options.agent.maxFreeSockets = 1;
        options.agent.maxCachedSessions = 0;
    }

    options.circapi.data = data;
    if (options.method === 'GET' && data !== null && Object.keys(data).length !== 0) {
        options.path += '?' + qs.stringify(data);
    }
    if (options.method === 'POST' || options.method === 'PUT' && data) {
        options.headers['Content-Length'] = JSON.stringify(data).length;
    }

    if (endpoint.match(/^\//)) {
        endpoint = endpoint.substring(1);
    }
    options.path += endpoint;

    return options;
};

exports.API = api;

/* support legacy API */
exports.setup = function(token, app, options) {
    singleton = new api(token, app, options);
};
exports.get = function(endpoint, data, callback) {
    singleton.get(endpoint, data, callback);
};
exports.post = function(endpoint, data, callback) {
    singleton.post(endpoint, data, callback);
};
exports.put = function(endpoint, data, callback) {
    singleton.put(endpoint, data, callback);
};
exports.delete = function(endpoint, callback) {
    singleton.delete(endpoint, callback);
};
