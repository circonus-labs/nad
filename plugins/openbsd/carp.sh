#!/bin/sh
# 
# Exposes details of CARP interfaces. See carp(4).

/sbin/ifconfig carp | /usr/bin/awk '
  $1 ~ /^carp[0-9]+/ {
    iface = substr($1,0,length($1)-1);
  }

  $1 == "carp:" {
    printf("%s`carpdev s %s\n", iface, $4);
    printf("%s`vhid I %d\n", iface, $6);
    printf("%s`advbase I %d\n", iface, $8);
    printf("%s`advskew I %d\n", iface, $10);
  }

  $1 == "status:" {
    printf("%s`status s %s\n", iface, $2);
  }
'
