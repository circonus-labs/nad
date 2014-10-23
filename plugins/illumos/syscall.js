var util = require('util'),
    da = require('dtrace_aggr'),
    path = require('path'),
    syscall = function() { da.apply(this); };

util.inherits(syscall,da);

syscall.prototype.execname = function() {
  var e = __filename.slice(__filename.lastIndexOf(path.sep)+1, __filename.length -3);
  if ( e == 'syscall' ) return '*';
  return e;
}
syscall.prototype.probe = function() {
  var e = this.execname();
  var p = '';
  if(e == '*') {
    p = 'syscall:::entry{self->start=timestamp;} syscall:::return/self->start/{@l[strjoin(probefunc,"`latency_us")] = llquantize((timestamp-self->start)/1000, 10, 0, 6, 100); self->start = 0;}';
  } else {
    p = 'syscall:::entry/execname=="' + e + '"/{self->start=timestamp;} syscall:::return/self->start/{@l[strjoin("syscall`",strjoin(probefunc,"`latency_us"))] = llquantize((timestamp-self->start)/1000, 10, 0, 6, 100); self->start = 0;}';
  }
  return p;
}
module.exports = syscall;
