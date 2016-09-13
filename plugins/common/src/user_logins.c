#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <utmpx.h>

int main() {
  int i;
  struct utmpx *ut;
  char **users = malloc(1024 * sizeof(*users));
  int n_users = 0, n_uniq = 0;
  int allocd_users = 1024;

  while((ut = getutxent()) != NULL) {
    if(ut->ut_type == LOGIN_PROCESS || ut->ut_type == USER_PROCESS) {
      if(n_users == allocd_users) {
        allocd_users *= 2;
        users = realloc(users, (allocd_users * sizeof(*users)));
        if(!users) exit(-2);
      }
      users[n_users++] = strdup(ut->ut_user);
    }
  }
  qsort(users, n_users, sizeof(*users), (int (*)(const void *, const void *))strcmp);

  printf("logged_in_users\ts\t");
  for(i=0;i<n_users;i++) printf("%s%s", i?",":"", users[i]);
  printf("\n");
  printf("logged_in_count\tL\t%d\n", n_users);


  char *last_user = "";
  for(i=0;i<n_users;i++) {
    if(!strcmp(users[i],last_user)) users[i] = "";
    else last_user = users[i];
  }
  qsort(users, n_users, sizeof(*users), (int (*)(const void *, const void *))strcmp);

  printf("uniq_logged_in_users\ts\t");
  for(i=0;i<n_users;i++) {
    if(!strcmp(users[i], "")) continue;
    printf("%s%s", n_uniq?",":"", users[i]);
    n_uniq++;
  }
  printf("\n");
  printf("uniq_logged_in_count\tL\t%d\n", n_uniq);

  endutxent();
  return 0;
}
