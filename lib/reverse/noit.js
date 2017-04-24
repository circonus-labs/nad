// Copyright 2016 Circonus, Inc. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/* eslint-disable no-plusplus */
/* eslint-disable no-bitwise */

'use strict';

const EventEmitter = require('events').EventEmitter;
const net = require('net');
const path = require('path');
const tls = require('tls');

const nad = require('nad');
const settings = require(path.join(nad.lib_dir, 'settings'));
const log = settings.logger.child({ module: 'reverse' });

// maximum amount of time (ms) between communications
// e.g. if interval between the last rx or tx and "now"
// is >MAX_COMM_INTERVAL, reset the reverse connection.
// this is a brute force timer, when communications get
// wedged and the socket timeout does not fire (for whatever
// reason, exact circumstances are not easy to replicate.).
const MAX_COMM_INTERVAL = 300 * 1000; // maximum amount of time between communications
const SOCKET_TIMEOUT = 90 * 1000;     // if no communications in this time, reset reverse
const WATCHDOG_ENABLED = true;
const WATCHDOG_INTERVAL = 60 * 1000;  // frequency of enforcing MAX_COMM_INTERVAL

// const CMD_BUFF_LEN = 4096;
const CMD_CLOSE = new Buffer('CLOSE', 'utf8');
const CMD_CONNECT = new Buffer('CONNECT', 'utf8');
const CMD_RESET = new Buffer('RESET', 'utf8');
const CMD_SHUTDOWN = new Buffer('SHUTDOWN', 'utf8');
const MAX_FRAME_LEN = 65530;

/**
 * decode_frame decodes incoming frames
 * @arg {Array} blist buffer list for frame
 * @returns {Object} decoded frame
 */
function decode_frame(blist) {
    const frame = {};
    const hdr = new Buffer(6); /* hdr uint16 + uint32 */
    let i = null;
    let avail = 0;
    let needed = 0;
    let read_header = false;

    for (i = 0; i < blist.length; i++) {
        needed = Math.min(blist[i].length, hdr.length - avail);
        blist[i].copy(hdr, avail, 0, needed);
        avail += needed;
        if (avail >= hdr.length) { /* header size */
            frame.channel_id = hdr.readUInt16BE(0);
            frame.command = Boolean(frame.channel_id & 0x8000);
            frame.channel_id &= 0x7fff;
            frame.bufflen = hdr.readUInt32BE(2);
            if (frame.bufflen > MAX_FRAME_LEN) {
                throw new Error(`oversized_frame: ${frame.bufflen}`); // try/catch wrap in caller, not a callback
            }
            frame.buff = new Buffer(frame.bufflen);
            read_header = true;
            break;
        }
    }

    if (!read_header) {
        return null;
    }

    if (needed === blist[i].length) { /* we used the whole buffer */
        i++;
        needed = 0;
    }

    let start = needed;

    avail = 0;
    for (; i < blist.length; i++) {
        needed = Math.min(blist[i].length - start, frame.buff.length - avail);
        blist[i].copy(frame.buff, avail, start, start + needed);
        avail += needed;
        if (avail === frame.buff.length) {
            /* we are complete... adjust out blist in place and return frame */
            if (start + needed === blist[i].length) {
                i++;
                start = 0;
                needed = 0;
            }

            if (i > 0) {
                blist.splice(0, i);
            }

            if (start + needed !== 0) {
                blist[0] = blist[0].slice(start + needed); // eslint-disable-line no-param-reassign
            }

            return frame;
        }
        start = 0;
    }

    return null;
}

/**
 * frame_output encodes output into frame
 * @arg {Number} channel_id channel id
 * @arg {Number} command command
 * @arg {Buffer} buff buffer
 * @returns {Buffer} output frame
 */
function frame_output(channel_id, command, buff) {
    const frame = new Buffer(6 + buff.length);

    buff.copy(frame, 6, 0, buff.length);
    frame.writeUInt16BE(channel_id & 0x7fff | (command ? 0x8000 : 0), 0); // eslint-disable-line no-mixed-operators
    frame.writeUInt32BE(buff.length, 2);

    return frame;
}

/**
 * isCmd determines whether a buffer contains a valid command
 * @arg {Buffer} buf1 incoming buffer
 * @arg {Buffer} buf2 command to compare it against
 * @returns {Boolean} is buf1 a command
 */
function isCmd(buf1, buf2) {
    if (buf1.length !== buf2.length) {
        return false;
    }
    for (let i = 0; i < buf1.length; i++) {
        if (buf1[i] !== buf2[i]) {
            return false;
        }
    }

    return true;
}

/**
 * getRetryInterval returns a random interval for retries
 * @returns {Number} miliseconds to wait
 */
function getRetryInterval() {
    const minRetryInterval = 5 * 1000; // 5 seconds
    const maxRetryInterval = 30 * 1000; // 30 seconds
    const interval = Math.random() * (maxRetryInterval - minRetryInterval + 1);

    return Math.floor(interval) + minRetryInterval;
}

class Connection extends EventEmitter {

    /**
     * creates new connection object
     * @arg {String} host to connect to
     * @arg {String} port to connect to
     * @arg {Object} creds connection credentials
     * @arg {String} cn common name
     */
    constructor(host, port, creds, cn) { // eslint-disable-line max-params
        super();

        this.host = host;
        this.port = port;
        this.cn = null;
        this.options = creds;
        this.options.host = host;
        this.options.port = port;
        this.remote = `${this.host}:${this.port}`;

        if (!{}.hasOwnProperty.call(this.options, 'rejectUnauthorized')) {
            this.options.rejectUnauthorized = false;
        }

        if (cn) {
            this.cn = cn;
            this.options.servername = cn;
        }

        this.buflist = [];
        this.channels = {};
        this.socket = null;

        this.commTracker = {
            lastRx : 0,
            lastTx : 0
        };
        this.watchdog = null;
        this.watchdogEnabled = WATCHDOG_ENABLED;
    }

    /**
     * reverse starts a reverse connection
     * @arg {String} remote_path of reverse connection
     * @arg {String} host to connect to
     * @arg {String} port to connect to
     * @returns {Undefined} nothing
     */
    reverse(remote_path, host, port) {
        const self = this;

        this._start((err) => {
            if (err !== null) {
                log.warn({
                    err  : err.message,
                    host : self.host
                }, 'resetting connection');
                if (self.socket) {
                    self.socket.end();
                }
            }

            log.debug({
                local_host  : host,
                local_port  : port,
                remote_host : self.host,
                remote_path
            }, 'tls.connect');

            self.buflist = [];
            const buff = new Buffer(`REVERSE /${remote_path} HTTP/1.1\r\n\r\n`, 'utf8');

            self.socket.write(buff);
            self.socket.on('data', (buffer) => {
                log.trace({ host: self.host }, 'received data packet');
                self.commTracker.lastRx = Date.now();
                self.buflist.push(buffer);
                try {
                    let frame = null;

                    while ((frame = decode_frame(self.buflist)) !== null) {
                        self._handle_frame(frame, host, port);
                    }
                } catch (errFrame) {
                    log.warn({
                        err   : errFrame.message,
                        host  : self.host,
                        stack : errFrame.stack
                    }, 'handling incoming packet');
                    self.socket.end();
                }
            });
        });
    }

    /**
     * handles incoming frame
     * @arg {Buffer} frame received
     * @arg {String} host receiving host
     * @arg {String} port receiving port
     * @returns {Undefined} nothing
     */
    _handle_frame(frame, host, port) {
        const self = this;
        let chan = null;

        if (!{}.hasOwnProperty.call(this.channels, frame.channel_id)) {
            this.channels[frame.channel_id] = { id: frame.channel_id };
        }

        chan = this.channels[frame.channel_id];

        if (!frame.command) {
            if (chan.socket) {
                log.debug({ channel: chan.id }, 'sending data to local');
                chan.socket.write(frame.buff);
                log.trace({ channel: chan.id }, 'sent data to local');
            } else {
                log.debug({ channel: chan.id, host: this.host }, 'sending reset command');
                this.socket.write(frame_output(chan.id, true, CMD_RESET));
                log.trace({ channel: chan.id, host: this.host }, 'sent reset command');
            }

            return;
        }

        if (isCmd(frame.buff, CMD_CLOSE) ||
            isCmd(frame.buff, CMD_RESET) ||
            isCmd(frame.buff, CMD_SHUTDOWN)) {
            if (!chan.socket) {
                log.warn('no chan.socket to close/reset/shutdown');

                return;
            }
            chan.socket.end();
            chan.socket.destroy();
            chan.socket = null;

            delete this.channels[frame.channel_id];
            if (Object.keys(this.channels).length === 0) {
                this.channels = {};
            }
            log.debug({
                channel : chan.id,
                cmd     : frame.buff.toString(),
                host,
                port
            }, 'disconnect');

            return;
        }

        if (isCmd(frame.buff, CMD_CONNECT)) {
            if (chan.socket) {
                chan.socket.end();
                chan.socket.destroy();
                chan.socket = null;
                this.channels[frame.channel_id] = { id: chan.id };
                chan = this.channels[frame.channel_id];
                this.socket.write(frame_output(chan.id, true, CMD_RESET));
            }

            log.debug({
                channel: chan.id,
                host,
                port
            }, 'connecting');
            chan.socket = net.connect({ host, port });

            chan.socket.on('connect', () => {
                if (!chan.socket) {
                    log.warn('connect event on chan.socket but no chan.socket...');

                    return;
                }

                log.debug({
                    channel: chan.id,
                    host,
                    port
                }, 'connected');
            });

            chan.socket.on('data', (buff) => {
                log.trace({
                    channel : chan.id,
                    host    : self.host
                }, 'sending data');
                const bl = buff.length;

                if (bl <= MAX_FRAME_LEN) {
                    self.socket.write(frame_output(chan.id, false, buff));
                    self.commTracker.lastTx = Date.now(); // update lastTx AFTER successful socket.write
                    log.trace({
                        channel : chan.id,
                        host    : self.host
                    }, 'sent data');

                    return;
                }

                let os = 0;

                while (os < bl) {
                    const tb_size = Math.min(MAX_FRAME_LEN, bl - os);
                    const tempbuff = new Buffer(tb_size);

                    buff.copy(tempbuff, 0, os, os + tb_size);
                    self.socket.write(frame_output(chan.id, false, tempbuff));
                    self.commTracker.lastTx = Date.now(); // update lastTx AFTER successful socket.write
                    log.trace({
                        channel : chan.id,
                        host    : self.host
                    }, 'sent data');
                    os += tempbuff.length;
                }
            });

            chan.socket.on('end', () => {
                log.info({
                    channel: chan.id,
                    host,
                    port
                }, 'disconnect - cse');
                self.socket.write(frame_output(chan.id, true, CMD_CLOSE));
                self.commTracker.lastTx = Date.now(); // update lastTx AFTER successful socket.write
                log.trace({
                    channel : chan.id,
                    host    : self.host
                }, 'sent close command');
            });

            chan.socket.on('error', (err) => {
                log.warn({
                    channel : chan.id,
                    err     : err.message,
                    host,
                    port,
                    remote  : self.host
                }, 'sending reset to remote');
                self.socket.write(frame_output(chan.id, true, CMD_RESET));
                log.trace({
                    channel : chan.id,
                    host    : self.host
                }, 'sent reset command');
            });

            return;
        }

        log.warn({
            buf : frame.buff.toString(),
            cmd : frame.command
        }, 'unknown command');
    }


    /**
     * starts a reverse connection
     * @arg {Function} cb callback
     * @returns {Undefined} nothing
     */
    _start(cb) {
        const self = this;

        log.info({ host: this.host }, 'connecting');

        if (this.watchdog !== null) {
            log.trace('clearing watchdog (inside start)');
            clearTimeout(this.watchdog);
            this.watchdog = null;
        }

        this.socket = tls.connect(this.options, () => {
            if (self.socket.authorized === false &&
                self.socket.authorizationError !== 'SELF_SIGNED_CERT_IN_CHAIN') {
                const err = new Error(`invalid cert: ${self.socket.authorizationError}`);

                cb(err, self);

                return;
            }
            self.remote_cert = self.socket.getPeerCertificate();
            if (self.cn !== null && self.remote_cert.subject.CN !== self.cn) {
                const err = new Error(`invalid cert: CN mismatch '${self.cn}' != '${self.remote_cert.subject.CN}'`);

                cb(err, self);

                return;
            }
            self.socket.authorized = true;
            if (self.watchdogEnabled && self.watchdog === null) {
                log.trace('setting watchdog (inside start connect cb)');
                self.watchdog = setTimeout(
                    self.commWatchdog.bind(self),
                    WATCHDOG_INTERVAL);
            }
            log.info({ host: self.host }, 'connected');

            cb(null, self);
        });

        this.socket.on('error', (err) => {
            log.error({
                err  : err.message,
                host : self.host
            }, 'remote');
            if (self.socket) {
                log.debug('socket.end() to trigger close');
                self.socket.end(); // trigger close event
            } else {
                log.debug('stop and re-call start (no self.socket)');
                self._stop();      // force cleanup
                setTimeout((ref) => {
                    ref._start(cb);
                }, getRetryInterval(), self);
            }
        });

        // enforce a timeout, normally there is no tiemout on sockets.
        this.socket.setTimeout(SOCKET_TIMEOUT);
        this.socket.on('timeout', () => {
            log.warn({
                host    : self.host,
                last_rx : self.commTracker.lastRx ? (new Date(self.commTracker.lastRx)).toISOString() : 'unknown',
                last_tx : self.commTracker.lastTx ? (new Date(self.commTracker.lastTx)).toISOString() : 'unknown'
            }, 'remote timeout event');
            if (self.socket) {
                log.trace('call socket.end to trigger close');
                self.socket.end(); // trigger close event
            } else {
                log.trace('stop and re-call start (no self.socket)');
                self._stop();      // force cleanup
                setTimeout((ref) => {
                    ref._start(cb);
                }, getRetryInterval(), self);
            }
        });

        this.socket.on('close', () => {
            log.debug({ host: self.host }, 'close event handler');
            if (self.watchdog !== null) {
                log.trace('clearing watchdog (inside start:close(event))');
                clearTimeout(self.watchdog);
                self.watchdog = null;
            }
            if (self.socket === null) {
                log.debug('socket already closed');
            } else if (self.socket.authorized === false) {
                log.warn({ host: self.host }, 'invalid cert');
            }
            self._stop();
            const retryInterval = getRetryInterval();

            log.warn({ delay: Math.round(retryInterval / 1000) }, 'reconnect');
            setTimeout((ref) => {
                ref._start(cb);
            }, retryInterval, self);
        });
    }

    /**
     * stops reverse connection
     * @returns {Undefined} nothing
     */
    _stop() {
        log.info({ host: this.host }, 'disconnecting');

        if (this.channels) {
            for (const channel_id in this.channels) { // eslint-disable-line guard-for-in
                const channel = this.channels[channel_id];

                if (channel.socket) {
                    channel.socket.end();
                    channel.socket.destroy();
                }
            }
        }

        if (this.socket !== null) {
            this.socket.end();
            this.socket.destroy();
        }

        this.buflist = [];
        this.channels = {};
        this.socket = null;
        this.commTracker = {
            lastRx : 0,
            lastTx : 0
        };
        this.watchdog = null;
    }

    /**
     * cleanup reverse connection
     * @returns {Undefined} nothing
     */
    reverse_cleanup() {
        this.buflist = [];
        if (this.channels) {
            for (const channel of this.channels) {
                if (channel.socket) {
                    channel.socket.end();
                    channel.socket.destroy();
                }
            }
            this.channels = {};
        }
        this.commTracker = {
            lastRx : 0,
            lastTx : 0
        };
    }

    /**
     * watches connections for unraised issues
     * @returns {Undefined} nothing
     */
    commWatchdog() {
        let stateOK = true;
        let rxInterval = 0;
        let txInterval = 0;

        log.trace('watchdog start');

        if (this.watchdog !== null) {
            log.trace('clearing watchdog (inside watchdog)');
            clearTimeout(this.watchdog);
            this.watchdog = null;
        }

        if (this.commTracker.lastRx > 0 && this.commTracker.lastTx > 0) {
            const ts = Date.now();

            rxInterval = ts - this.commTracker.lastRx;
            txInterval = ts - this.commTracker.lastTx;

            stateOK = rxInterval < MAX_COMM_INTERVAL &&
                txInterval < MAX_COMM_INTERVAL;

            log.trace({
                last_rx : rxInterval > 1000 ? `${Math.round(rxInterval / 1000)}s` : `${rxInterval}ms`,
                last_tx : txInterval > 1000 ? `${Math.round(txInterval / 1000)}s` : `${txInterval}ms`,
                state   : stateOK
            }, 'rx/tx state');
        }

        if (stateOK) {
            log.trace('setting watchdog (inside watchdog)');
            this.watchdog = setTimeout(
                this.commWatchdog.bind(this),
                WATCHDOG_INTERVAL);
        } else {
            log.warn({
                host         : this.host,
                last_rx      : rxInterval,
                last_tx      : txInterval,
                max_interval : MAX_COMM_INTERVAL
            }, 'resetting connection (excessive interval)');
            if (this.socket !== null) {
                this.socket.end();
            }
        }
        log.trace('watchdog end');
    }

    /**
     * toggles watchdog on/off
     * @returns {Undefined} nothing
     */
    toggleWatchdog() {
        if (this.watchdogEnabled) {
            this.watchdogEnabled = false;
            if (this.watchdog !== null) {
                clearTimeout(this.watchdog);
                this.watchdog = null;
            }
        } else {
            this.watchdogEnabled = true;
            this.commWatchdog();
        }
    }

}

module.exports.Connection = Connection;
