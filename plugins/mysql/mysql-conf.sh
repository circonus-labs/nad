#
# to use:
#
# cp mysql-conf.sh /opt/circonus/etc

# --- edit and update variables ---
# vi /opt/circonus/etc/mysql-conf.sh
#
# --- if nad daemon runs as 'nobody', do not leave world-readable ---
# chgrp nobody /opt/circonus/etc/mysql-conf.sh
# chmod 640 /opt/circonus/etc/mysql-conf.sh
#
# set credentials accordingly, if not set, auth is not used for
# the account running the query (whatever id owns the nad process).
# IOW, create and test a dedicated user for predictive results.
#
# a simple mysql CREATE USER is all that is required. no additional
# GRANTs are needed for SHOW STATUS.
# e.g.
# $ mysql -e "CREATE USER 'nad'@'localhost' IDENTIFIED BY 'some_password'" -p
#
# note: additional grants are needed for replication status and
#       a different query for the replication stats beyond what
#       is in show status.
#

# Options, uncomment and set accordingly:

# MYSQL_USER=""

# MYSQL_PASS=""

# MYSQL_HOST='127.0.0.1'

# MYSQL_PORT='3306'

# MYSQL_METRICS=( \
#    Aborted_clients \
#    Aborted_connects \
#    Bytes_received \
#    Bytes_sent \
#    Connections \
#    Open_files \
#    Qcache_hits \
#    Qcache_inserts \
#    Queries \
#    Slow_queries \
#    Table_locks_waited \
#    Threads_connected \
#    Threads_running \
#    Uptime_since_flush_status
#)

## END
