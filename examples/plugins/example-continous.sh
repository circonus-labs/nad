#!/bin/bash
#
# Example of a long running executable plugin that emits continous output
#

# Emit a blank metric set at the beginning, so that nad does not wait for us
printf "\n"

# take some time to initialize
sleep 20

while true
do
    # emit metric data
    printf "%s\t%s\t%s\n" "time" "l" "$(date +%s)"
    # signal end of metric set, by emitting a newline
    printf "\n"
    # Only the last metric set is submitted. Hence we need to align emission with collection
    # interval:
    sleep 60
done
