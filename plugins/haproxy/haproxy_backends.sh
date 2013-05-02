#!/usr/bin/bash

PATH="/opt/local/bin:/opt/local/sbin:/usr/bin:/usr/sbin";

# Set field delimiters to line breaks
OLDIFS=$IFS
LINEBREAKS=$( echo -en "\n\b" )
IFS=$LINEBREAKS

# get all backends from all proxies
backends=`echo "show stat -1 2 -1" | nc -U /var/run/haproxy.sock`
for backend in $backends; do

  # skip comments and headers
  if [[ "$backend" = "#"* ]]; then continue; fi

  IFS=","
  DATA=( `echo "${backend}"` )
  PREFIX="haproxy:${DATA[0]}:backend:"

  echo -e "${PREFIX}queued\tL\t${DATA[2]}"
  echo -e "${PREFIX}queue_max\tL\t${DATA[3]}"
  echo -e "${PREFIX}sessions\tL\t${DATA[4]}"
  echo -e "${PREFIX}session_max\tL\t${DATA[5]}"
  echo -e "${PREFIX}session_limit\tL\t${DATA[6]}"
  echo -e "${PREFIX}session_count\tL\t${DATA[7]}"
  echo -e "${PREFIX}bytes_in\tL\t${DATA[8]}"
  echo -e "${PREFIX}bytes_out\tL\t${DATA[9]}"
  echo -e "${PREFIX}denied_requests\tL\t${DATA[10]}"
  echo -e "${PREFIX}denied_responses\tL\t${DATA[11]}"
  echo -e "${PREFIX}request_errors\tL\t${DATA[12]}"
  echo -e "${PREFIX}conn_err\tL\t${DATA[13]}"
  echo -e "${PREFIX}resp_err\tL\t${DATA[14]}"
  echo -e "${PREFIX}retries\tL\t${DATA[15]}"
  echo -e "${PREFIX}redispatches\tL\t${DATA[16]}"
  echo -e "${PREFIX}status\ts\t${DATA[17]}"
  echo -e "${PREFIX}total_weight\ts\t${DATA[18]}"
  echo -e "${PREFIX}active_servers\ts\t${DATA[19]}"
  echo -e "${PREFIX}backup_servers\ts\t${DATA[20]}"
  echo -e "${PREFIX}checks_failed\tL\t${DATA[21]}"
  echo -e "${PREFIX}checks_down\tL\t${DATA[22]}"
  echo -e "${PREFIX}last_status_change\tL\t${DATA[23]}"
  echo -e "${PREFIX}downtime\tL\t${DATA[24]}"
  echo -e "${PREFIX}queue_limit\tL\t${DATA[25]}"
  echo -e "${PREFIX}instance_id\tL\t${DATA[26]}"
  echo -e "${PREFIX}proxy_id\tL\t${DATA[27]}"
  echo -e "${PREFIX}service_id\tL\t${DATA[28]}"
  echo -e "${PREFIX}throttle\tL\t${DATA[29]}"
  echo -e "${PREFIX}server_selected_count\tL\t${DATA[30]}"
  echo -e "${PREFIX}type\tI\t${DATA[32]}"
  echo -e "${PREFIX}session_rate_per_s\tL\t${DATA[33]}"
  echo -e "${PREFIX}session_limit_per_s\tL\t${DATA[34]}"
  echo -e "${PREFIX}session_max_per_s\tL\t${DATA[35]}"
  echo -e "${PREFIX}check_status\ts\t${DATA[36]}"
  echo -e "${PREFIX}check_code\ts\t${DATA[37]}"
  echo -e "${PREFIX}check_duration\tL\t${DATA[38]}"
  echo -e "${PREFIX}1xx_responses\tL\t${DATA[39]}"
  echo -e "${PREFIX}2xx_responses\tL\t${DATA[40]}"
  echo -e "${PREFIX}3xx_responses\tL\t${DATA[41]}"
  echo -e "${PREFIX}4xx_responses\tL\t${DATA[42]}"
  echo -e "${PREFIX}5xx_responses\tL\t${DATA[43]}"
  echo -e "${PREFIX}other_responses\tL\t${DATA[44]}"
  echo -e "${PREFIX}failed_health_checks\tL\t${DATA[45]}"
  echo -e "${PREFIX}requests_per_second\tL\t${DATA[46]}"
  echo -e "${PREFIX}request_max_per_second\tL\t${DATA[47]}"
  echo -e "${PREFIX}request_count\tL\t${DATA[48]}"
  echo -e "${PREFIX}client_aborts\tL\t${DATA[49]}"
  echo -e "${PREFIX}server_aborts\tL\t${DATA[50]}"

done

# restore field delimiter
IFS=$OLDIFS
