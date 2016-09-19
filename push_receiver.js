function PushReceiver() {
    this.set = {};
};

function __aggr(tgt, src) {
    for(var key in src) {
        if(!tgt.hasOwnProperty(key)) {
            tgt[key] = { "_type" : src[key]._type, "_value": []};
        }
        if (Array.isArray(src[key]._value)) {
            for (var v in src[key]._value) {
                tgt[key]._value.push(src[key]._value[v]);
            }
        } else {
            tgt[key]._value.push(src[key]._value);
        }
    }
}


PushReceiver.prototype.run = function(details, cb, req, args, instance) {
    for (var x in this.set) {
        var o = this.set[x];
        
        var period = req ? req.headers['x-reconnoiter-period'] : 0;
        if(!period) period = 60000;
        var this_idx = Math.floor((+new Date()) / 1000);
        var start_idx = this_idx -= Math.floor(period/1000);
        var s = {};
        for(var i = start_idx; i <= o.last_idx; i++) {
            __aggr(s, o.windows[i % 60]);
        }

        /* parse/stringify for a deep copy */
        cb(details, JSON.parse(JSON.stringify(s)), x);
    }
    details.running = false;
};
        
PushReceiver.prototype.some_data = function(name, data) {
    console.log("Received some_data for [" + name + "]: " + data);
    var x = JSON.parse(data);

    if (!this.set.hasOwnProperty(name)) {
        this.set[name] = {};
        this.set.last_idx = 0;
        this.set[name].windows = [];
        for (var i = 0; i < 60; i++) this.set[name].windows[i] = {};
    }

    var o = this.set[name];

    /* for each incoming key, save all the data */
    var this_idx = Math.floor((+new Date()) / 1000);
    if(!o.last_idx) o.last_idx = this_idx;

    /* everything from last up to now is moot */
    for(var i = o.last_idx + 1; i < this_idx; i++) {
      o.windows[i % 60] = {};
    }
    console.log("Saving incoming " + JSON.stringify(x) + " in " + (this_idx % 60));
    o.windows[this_idx % 60] = x;
    o.last_idx = this_idx;    
};

module.exports = PushReceiver;