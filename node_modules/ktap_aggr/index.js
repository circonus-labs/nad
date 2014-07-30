var sys = require('sys'),
    spawn = require('child_process').spawn,
    da = function() {
      this.start();
      this.windows = [];
      for(var i=0; i<60; i++) this.windows.push({});
    };

da.prototype.probe = function() {
  throw Error("abstract dtrace aggregator used");
}
da.prototype.start = function() {
  var self = this;
  var prog = this.probe();
  this.ts = 0;
  this.buff = '';
  this.cmd = spawn("/usr/bin/ktap", [ '-e', prog ]);
  this.cmd.on('exit', function() {
    setTimeout(function() { self.start(); }, 1000);
  });
  this.cmd.stderr.on('data', function(buff) {
    console.log(buff.toString());
  });
  this.cmd.stdout.on('data', function(buff) {
    /* split into lines, keeping leftovers */
    self.buff = self.buff + buff;
    var lines = self.buff.split('\n');
    if (lines[lines.length-1] != '') self.buff = lines.pop()
    else self.buff = '';

    for(var i=0; i<lines.length; i++) {
      /* parse ts: lines */
      var m = lines[i].match(/^ts:(\d+)/);
      if(m !== null) {
        self.key = null;
        self.ts = Math.floor(m[1] / 1000000);
      }

      /* parse key: lines */
      var m = lines[i].match(/^key:(\S+)/);
      if(m !== null) self.key = m[1];

      if(self.ts > 0) {
        if(self.ts > self.last_idx && self.last_idx > 0) {
          for(var idx = self.last_idx+1; idx <= self.ts; idx++) {
console.log("Clearing ", idx%60);
            self.windows[idx%60] = {};
          }
        }
        var m = lines[i].match(/^\s*(\d+)\D+(\d+)/);
        if(m !== null) {
          var v = parseInt(m[2]);
          if(!self.windows[self.ts % 60].hasOwnProperty('all'))
            self.windows[self.ts % 60]['all'] = {}
          if(!self.windows[self.ts % 60]['all'].hasOwnProperty(m[1]))
            self.windows[self.ts % 60]['all'][m[1]] = v;
          else
            self.windows[self.ts % 60]['all'][m[1]] += v
          if(self.key) {
            if(!self.windows[self.ts % 60].hasOwnProperty(self.key))
              self.windows[self.ts % 60][self.key] = {}
            if(!self.windows[self.ts % 60][self.key].hasOwnProperty(m[1]))
              self.windows[self.ts % 60][self.key][m[1]] = v;
            else
              self.windows[self.ts % 60][self.key][m[1]] += v;
          }
        }
        self.last_idx = self.ts;
      }
    }
  });

  this.pulse = setInterval((function(self) { return function() {
    var g_hist = {};
    var this_idx = Math.floor((+new Date()) / 1000);
    if(self.last_idx > this_idx - 2) return;
    for(var i = self.last_idx+1; i < this_idx; i++) {
console.log("period Clearing ", i%60);
      self.windows[i%60] = {};
    }
    self.last_idx = this_idx-1;
  }})(this), 1000);
};

function __aggr(tgt, src) {
  for(var dev in src) {
    if(!tgt.hasOwnProperty(dev)) tgt[dev] = {};
    var src_lath = src[dev];
    var tgt_lath = tgt[dev];
    for(var lat in src_lath) {
      if(!tgt_lath.hasOwnProperty(lat)) tgt_lath[lat] = src_lath[lat];
      else tgt_lath[lat] += src_lath[lat];
    }
  }
}
function __mklist(lath) {
  var r = [];
  for(var key in lath) r.push("H["+key+"]="+lath[key]);
  return r;
}
da.prototype.run = function(d, cb, req, args, instance) {
  var period = req ? req.headers['x-reconnoiter-period'] : 0;
  if(!period) period = 60000;
  var this_idx = Math.floor((+new Date()) / 1000);
  var start_idx = this_idx -= Math.floor(period/1000);
  var o = {};
  for(var i=start_idx;i<=this.last_idx;i++) {
    __aggr(o, this.windows[i%60]);
  }
  var resmon = {}
  for(var key in o) {
    resmon[key] = { '_type': 'n', '_value': __mklist(o[key]) };
  }
  cb(d, resmon, instance);
  d.running = false;
};

module.exports = da;
