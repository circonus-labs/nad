#!/bin/bash
# Systemd module, shows the count of each systemd unit in various states, and
# also will print out the name of a failed/errored unit (most recent only).
# By default all units are included (including inactive units)
# If you want to only include active units, pass the 'active_only' parameter
# to the check. In other words, from create a systemd.json file with the
# following contents: [["active_only"]]
PARAMS="--all"
[[ $1 == "active_only" ]] && PARAMS=
systemctl --full --no-legend --no-pager $PARAMS | awk '
    BEGIN {
        # Prepopulate some metrics, so they show even if there are no services
        # in the state.
        load["loaded"] = 0
        load["error"] = 0
        load["masked"] = 0
        state["active"] = 0
        state["reloading"] = 0
        state["activating"] = 0
        state["deactivating"] = 0
        state["inactive"] = 0
        state["failed"] = 0
        service_error = "[[null]]"
        service_failed = "[[null]]"
    }
    {
        load[$2]++
        state[$3]++
    }
    # This will only store one service at a time, but it is good as a basic
    # indicator
    $2 == "error" { service_error = $1 }
    $3 == "failed" { service_failed = $1 }
    END {
        for (i in load) {
            print "load`" i "\tL\t" load[i]
        }
        for (i in state) {
            print "state`" i "\tL\t" state[i]
        }
        print "service`error\ts\t" service_error
        print "service`failed\ts\t" service_failed
    }
'
