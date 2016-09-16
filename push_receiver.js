function PushReceiver() {
    this.set = {};
};

PushReceiver.prototype.run = function(details, cb, req, args, instance) {
    for (var x in this.set) {
	console.log("Calling data callback with: " + JSON.stringify(this.set[x]));
	
	// deep copy the incoming object as we are about to wipe it.
        cb(details, JSON.parse(JSON.stringify(this.set[x])), x);
	// wipe all values as we just submitted them
	// this leaves behind the metric definitions
	for (var y in this.set[x]) {
	    this.set[x][y]._value = null;
	}
    }
    details.running = false;
};

PushReceiver.prototype.some_data = function(name, data) {
    console.log("Received some_data for [" + name + "]: " + data);
    var x = JSON.parse(data);
    if (this.set[name] == undefined) {
        this.set[name] = {};
    }

    for (var y in x) {
	//console.log("Field: " + JSON.stringify(x[y]));
        if (this.set[name][y] == undefined || this.set[name][y] == null) {
	    console.log(name + "[" + y + "] is undefined or null");
            this.set[name][y] = x[y];
	    //console.log("Set to: " + JSON.stringify(this.set[name][y]));
	    
        } else {
            if(!Array.isArray(this.set[name][y]._value)) { // upgrade to array
		//console.log("Upgrading to array");
                this.set[name][y]._value = [ this.set[name][y]._value ];
            }
	    if (Array.isArray(x[y]._value)) {
		//console.log("Incoming data is array");
		for (var z in x[y]._value) {
		    this.set[name][y]._value.push(x[y]._value[z]);
		}
	    } else {
		this.set[name][y]._value.push(x[y]._value);
	    }
	    console.log("Set to: " + JSON.stringify(this.set[name][y]));
        }
    }
};

module.exports = PushReceiver;
