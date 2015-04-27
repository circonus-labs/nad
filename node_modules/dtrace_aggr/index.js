var sys = require('sys')
    libdtrace = require('libdtrace'),
    da = function() {
      this.dtp = new libdtrace.Consumer();
      this.start();
      this.windows = [];
      for(var i=0; i<60; i++) this.windows.push({});
    };

da.prototype.probe = function() {
  throw Error("abstract dtrace aggregator used");
}
da.prototype.transform = function(v) {
  return v;
}
da.prototype.start = function() {
  var a;
  var prog = this.probe();
  a = this.dtp.strcompile(prog);
  a = this.dtp.go();

  this.dtp.consume(function (probe, rec) { });

  this.pulse = setInterval((function(self) { return function() {
    var g_hist = {};
    self.dtp.aggwalk(function (id, key, val) {
      for(var i=0; i<val.length; i++) {
        var latency = self.transform(val[i][0][0]);
        var count = val[i][1];
        if(!g_hist.hasOwnProperty(key)) g_hist[key] = {};
        if(!g_hist[key].hasOwnProperty(""+latency))
          g_hist[key][""+latency] = parseInt(count);
        else
          g_hist[key][""+latency] += parseInt(count);
      }
    });
    self.dtp.aggclear();
    var this_idx = Math.floor((+new Date()) / 1000);
    if(!self.last_idx) self.last_idx = this_idx;
    for(var i = self.last_idx+1; i < this_idx; i++) {
      self.windows[i%60] = {};
    }
    self.windows[this_idx % 60] = g_hist;
    self.last_idx = this_idx;
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
