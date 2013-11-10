var util = require('util'),
    da = require('dtrace_aggr'),
    io = function() { da.apply(this); };

util.inherits(io,da);

io.prototype.probe = function() {
  return 'io:::start{a[arg0] = timestamp;} io:::done/a[arg0]/{@l[strjoin(args[1]->dev_statname,strjoin("`",args[0]->b_flags & B_READ ? "read_latency_us" : "write_latency_us"))] = llquantize((timestamp-a[arg0])/1000, 10, 0, 6, 100); @l[strjoin(args[1]->dev_statname,"`latency_us")] = llquantize((timestamp-a[arg0])/1000, 10, 0, 6, 100); @l[strjoin(args[1]->dev_name,"`latency_us")] = llquantize((timestamp-a[arg0])/1000, 10, 0, 6, 100); a[arg0] = 0;}';
}
module.exports = io;
