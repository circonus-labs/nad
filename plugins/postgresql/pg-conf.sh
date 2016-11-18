#!/bin/bash
#
# This file will be sourced by each of the postgres plugin scripts.  nad looks
# for this file in /opt/circonus/etc/pg-conf.sh.
#
# to use:
#
# cp pg-conf.sh /opt/circonus/etc

# --- edit and update variables --
# vi /opt/circonus/etc/pg-conf.sh

# --- if nad daemon runs as 'nobody', do not leave world-readable ---
# chgrp nobody /opt/circonus/etc/pg-conf.sh
# chmod 640 /opt/circonus/etc/pg-conf.sh
#
# set credentials accordingly, if not set, auth is not used for
# the account running the query (whatever id owns the nad process).
# IOW, create and test a dedicated user for predictive results.
#
# Options, uncomment and set accordingly:

## The user to run pg_stat queries as.
# PGUSER="postgres"

## The password for the PGUSER
# PGPASS=""

## The port that postgres is listening on, on this host
# PGPORT=5432

## The database to use when querying database specific info like pg_statio_user_tables for cache hits.
## usually this would be set to the database you want to monitor.
# PGDATABASE="postgres"

## The postgresql plugin requires that `psql` and `pg_isready` is in the exec PATH, so add here 
## if they are not already
# PATH=$PATH:/path/to/psql


