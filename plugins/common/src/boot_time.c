#include <stdio.h>
#include <time.h>
#include <utmpx.h>

int main() {
  struct utmpx *ut;
  while((ut = getutxent()) != NULL && ut->ut_type != BOOT_TIME);
  if(ut != NULL) {
    char time_str[64];
    struct tm *tm;
    time_t as_time_t = ut->ut_tv.tv_sec;
    tm = gmtime(&as_time_t);
    strftime(time_str, sizeof(time_str), "%Y-%m-%d %H:%M:%S", tm);
    printf("epoch\tL\t%llu\n", (long long unsigned)ut->ut_tv.tv_sec);
    printf("date\ts\t%s\n", time_str);
  } else {
    printf("epoch\tL\t[[null]]\n");
    printf("date\ts\t[[null]]\n");
  }
  endutxent();
  return 0;
}
