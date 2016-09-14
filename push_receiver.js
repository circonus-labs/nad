function PushReceiver() {
    this.set = {};
};

PushReceiver.prototype.run = function(details, cb, req, args, instance) {
    for (var x in this.set) {            
        cb(details, this.set[x], x);
        delete this.set[x];
    }
    details.running = false;
};

PushReceiver.prototype.some_data = function(name, data) {
    var x = JSON.parse(data);
    if (this.set[name] == undefined) {
        this.set[name] = {};
    }
    for (var y in x) {
        if (this.set[name][y] == undefined) {
            this.set[name][y] = x[y];
        } else {
            if(!Array.isArray(this.set[name][y]._value)) { // upgrade to array
                this.set[name][y]._value = [ this.set[name][y]._value ];
            }
            this.set[name][y]._value.push(x[y]._value);
        }
    }
};

module.exports = PushReceiver;
