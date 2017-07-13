#!/bin/bash
#
# Example of a long running executable plugin that emits continous output
#
while true
do
    # emit metric data
    printf "%s\t%s\t%s\n" "an_integer_metric" "l" "123456789"
    printf "%s\t%s\t%s\n" "a_float_metric" "n" "1.2345678"
    # signal end of metric set, by emitting a newline
    printf "\n"
    sleep 10
done
