#!/bin/bash
# Circonus 2016

# Simple script to grab basic APC UPS status
# add '-f configfile' if needed 

apcaccess -u | while read x; do
  echo $x | grep STATUS | sed 's/:/s/'
  echo $x | grep TIMELEFT | sed 's/:/L/'
  echo $x | grep BCHARGE | sed 's/:/n/'
  echo $x | grep BATTV | sed 's/:/L/'
done
