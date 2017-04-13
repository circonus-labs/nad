/*
Copyright (c) 2016 Circonus, Inc. All rights reserved.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above
      copyright notice, this list of conditions and the following
      disclaimer in the documentation and/or other materials provided
      with the distribution.
    * Neither the name Circonus, Inc. nor the names of its contributors
      may be used to endorse or promote products derived from this
      software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/* eslint-disable no-sync */
/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
/* eslint-disable no-bitwise */

'use strict';

const EventEmitter = require('events').EventEmitter;
const net = require('net');
const tls = require('tls');

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
                start = needed = 0;
            }

            if (i > 0) {
                blist.splice(0, i);
            }

            if (start + needed !== 0) {
                blist[0] = blist[0].slice(start + needed);
            }

            return frame;
        }
        start = 0;
    }
    return null;
}

function frame_output(channel_id, command, buff) {
    const frame = new Buffer(6 + buff.length);

    buff.copy(frame, 6, 0, buff.length);
    frame.writeUInt16BE(channel_id & 0x7fff | (command ? 0x8000 : 0), 0); // eslint-disable-line no-mixed-operators
    frame.writeUInt32BE(buff.length, 2);
    return frame;
}

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

function getRetryInterval() {
    const minRetryInterval = 5 * 1000; // 5 seconds
    const maxRetryInterval = 30 * 1000; // 30 seconds

    return Math.floor(Math.random() * (maxRetryInterval - minRetryInterval + 1)) + minRetryInterval;
}

class Connection extends EventEmitter {
    constructor(port, host, creds, cn, log) { // eslint-disable-line max-params
        super();

        this.cn = null;
        this.port = port;
        this.host = host;
        this.log = log;
        this.remote = `${host}:${port}`;
        this.options = creds;
        this.options.host = host;
        this.options.port = port;

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
            lastRx: 0,
            lastTx: 0
        };
        this.watchdog = null;
        this.watchdogEnabled = WATCHDOG_ENABLED;
    }

    reverse(name, host, port) {
        const self = this;

        this._start((err) => {
            if (err !== null) {
                self.log.warn({ host: self.host, err }, 'resetting connection');
                if (self.socket) {
                    self.socket.end();
                }
            }

            self.log.debug({ remote_host: self.host, name, local_host: host, local_port: port }, 'tls.connect');

            self.buflist = [];
            const buff = new Buffer(`REVERSE /${name} HTTP/1.1\r\n\r\n`, 'utf8');

            self.socket.write(buff);
            self.socket.on('data', (buffer) => {
                self.log.trace({ host: self.host }, 'received data packet');
                self.commTracker.lastRx = Date.now();
                self.buflist.push(buffer);
                try {
                    let frame = null;

                    while (null !== (frame = decode_frame(self.buflist))) {
                        self._handle_frame(frame, host, port);
                    }
                } catch (frameErr) {
                    self.log.warn({ host: self.host, err: frameErr, stack: frameErr.stack }, 'handling incoming packet');
                    self.socket.end();
                }
            });
        });
    }

    _handle_frame(frame, host, port) {
        const self = this;
        let chan = null;

        if (!{}.hasOwnProperty.call(this.channels, frame.channel_id)) {
            this.channels[frame.channel_id] = { id: frame.channel_id };
        }

        chan = this.channels[frame.channel_id];

        if (!frame.command) {
            if (chan.socket) {
                this.log.debug({ channel: chan.id }, 'sending data to local');
                chan.socket.write(frame.buff);
                this.log.trace({ channel: chan.id }, 'sent data to local');
            } else {
                this.log.debug({ host: this.host, channel: chan.id }, 'sending reset command');
                this.socket.write(frame_output(chan.id, true, CMD_RESET));
                this.log.trace({ host: this.host, channel: chan.id }, 'sent reset command');
            }
            return;
        }

        if (isCmd(frame.buff, CMD_CLOSE) ||
            isCmd(frame.buff, CMD_RESET) ||
            isCmd(frame.buff, CMD_SHUTDOWN)) {

            if (!chan.socket) {
                this.log.warn('no chan.socket to close/reset/shutdown');
                return;
            }
            chan.socket.end();
            chan.socket.destroy();
            chan.socket = null;

            delete this.channels[frame.channel_id];
            if (Object.keys(this.channels).length === 0) {
                this.channels = {};
            }
            this.log.debug({ host, port, channel: chan.id, cmd: frame.buff.toString() }, 'disconnect');

            return;
        }

        if (isCmd(frame.buff, CMD_CONNECT)) {
            if (chan.socket) {
                chan.socket.end();
                chan.socket.destroy();
                chan.socket = null;
                chan = this.channels[frame.channel_id] = { id: chan.id };
                this.socket.write(frame_output(chan.id, true, CMD_RESET));
            }

            this.log.debug({ host, port, channel: chan.id }, 'connecting');
            chan.socket = net.connect({ host, port });

            chan.socket.on('connect', () => {
                if (!chan.socket) {
                    self.log.warn('connect event on chan.socket but no chan.socket...');
                    return;
                }

                self.log.debug({ host, port, channel: chan.id }, 'connected');
            });

            chan.socket.on('data', (buff) => {
                self.log.trace({ host: self.host, channel: chan.id }, 'sending data');
                const bl = buff.length;

                if (bl <= MAX_FRAME_LEN) {
                    self.socket.write(frame_output(chan.id, false, buff));
                    self.commTracker.lastTx = Date.now(); // update lastTx AFTER successful socket.write
                    self.log.trace({ host: self.host, channel: chan.id }, 'sent data');
                    return;
                }

                let os = 0;

                while (os < bl) {
                    const tb_size = Math.min(MAX_FRAME_LEN, bl - os);
                    const tempbuff = new Buffer(tb_size);

                    buff.copy(tempbuff, 0, os, os + tb_size);
                    self.socket.write(frame_output(chan.id, false, tempbuff));
                    self.commTracker.lastTx = Date.now(); // update lastTx AFTER successful socket.write
                    self.log.trace({ host: self.host, channel: chan.id }, 'sent data');
                    os += tempbuff.length;
                }
            });

            chan.socket.on('end', () => {
                self.log.info({ host, port, channel: chan.id }, 'disconnect - cse');
                self.socket.write(frame_output(chan.id, true, CMD_CLOSE));
                self.commTracker.lastTx = Date.now(); // update lastTx AFTER successful socket.write
                self.log.trace({ host: self.host, channel: chan.id }, 'sent close command');
            });

            chan.socket.on('error', (err) => {
                self.log.warn({ remote: self.host, host, port, channel: chan.id, err }, 'sending reset to remote');
                self.socket.write(frame_output(chan.id, true, CMD_RESET));
                self.log.trace({ host: self.host, channel: chan.id }, 'sent reset command');
            });

            return;
        }

        this.log.warn({ cmd: frame.command, buf: frame.buff.toString() }, 'unknown command');
    }


    _start(cb) {
        const self = this;

        this.log.info({ host: this.host }, 'connecting');

        if (this.watchdog !== null) {
            this.log.trace('clearing watchdog (inside start)');
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
                self.log.trace('setting watchdog (inside start connect cb)');
                self.watchdog = setTimeout(self.commWatchdog, WATCHDOG_INTERVAL, self);
            }
            self.log.info({ host: self.host }, 'connected');

            cb(null, self);
            return;
        });

        this.socket.on('error', (err) => {
            self.log.error({ host: self.host, err }, 'remote');
            if (self.socket) {
                self.log.debug('socket.end() to trigger close');
                self.socket.end(); // trigger close event
            } else {
                self.log.debug('stop and re-call start (no self.socket)');
                self._stop();      // force cleanup
                setTimeout((ref) => {
                    ref._start(cb);
                }, getRetryInterval(), self);
            }
        });

        // enforce a timeout, normally there is no tiemout on sockets.
        this.socket.setTimeout(SOCKET_TIMEOUT);
        this.socket.on('timeout', () => {
            self.log.warn({
                last_rx: self.commTracker.lastRx ? (new Date(self.commTracker.lastRx)).toISOString() : 'unknown',
                last_tx: self.commTracker.lastTx ? (new Date(self.commTracker.lastTx)).toISOString() : 'unknown',
                host: self.host
            }, 'remote timeout event');
            if (self.socket) {
                self.log.trace('call socket.end to trigger close');
                self.socket.end(); // trigger close event
            } else {
                self.log.trace('stop and re-call start (no self.socket)');
                self._stop();      // force cleanup
                setTimeout((ref) => {
                    ref._start(cb);
                }, getRetryInterval(), self);
            }
        });

        this.socket.on('close', () => {
            self.log.debug({ host: self.host }, 'close event handler');
            if (self.watchdog !== null) {
                self.log.trace('clearing watchdog (inside start:close(event))');
                clearTimeout(self.watchdog);
                self.watchdog = null;
            }
            if (self.socket === null) {
                self.log.debug('socket already closed');
            } else if (self.socket.authorized === false) {
                self.log.warn({ host: self.host }, 'invalid cert');
            }
            self._stop();
            const retryInterval = getRetryInterval();

            self.log.warn({ delay: Math.round(retryInterval / 1000) }, 'reconnect');
            setTimeout((ref) => {
                ref._start(cb);
            }, retryInterval, self);
        });
    }

    _stop() {
        this.log.info({ host: this.host }, 'disconnecting');

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
            lastRx: 0,
            lastTx: 0
        };
        this.watchdog = null;
    }

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
            lastRx: 0,
            lastTx: 0
        };
    }

    commWatchdog(ref) {
        let stateOK = true;
        let rxInterval = 0;
        let txInterval = 0;

        ref.log.trace('watchdog start');

        if (ref.watchdog !== null) {
            ref.log.trace('clearing watchdog (inside watchdog)');
            clearTimeout(ref.watchdog);
            ref.watchdog = null;
        }

        if (ref.commTracker.lastRx > 0 && ref.commTracker.lastTx > 0) {
            const ts = Date.now();

            rxInterval = ts - ref.commTracker.lastRx;
            txInterval = ts - ref.commTracker.lastTx;
            stateOK = rxInterval < MAX_COMM_INTERVAL && txInterval < MAX_COMM_INTERVAL;
            ref.log.trace({
                last_rx: rxInterval > 1000 ? `${Math.round(rxInterval / 1000)}s` : `${rxInterval}ms`,
                last_tx: txInterval > 1000 ? `${Math.round(txInterval / 1000)}s` : `${txInterval}ms`,
                state: stateOK
            }, 'rx/tx state');
        }

        if (stateOK) {
            ref.log.trace('setting watchdog (inside watchdog)');
            ref.watchdog = setTimeout(ref.commWatchdog, WATCHDOG_INTERVAL, ref);
        } else {
            ref.log.warn({
                host: ref.host,
                last_rx: rxInterval,
                last_tx: txInterval,
                max_interval: MAX_COMM_INTERVAL
            }, 'resetting connection (excessive interval)');
            if (ref.socket !== null) {
                ref.socket.end();
            }
        }
        ref.log.trace('watchdog end');
    }

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
