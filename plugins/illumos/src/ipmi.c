#include <stdio.h>
#include <stdlib.h>

static void print_line(char *name, char *name2, char *val) {
  
  char *typename = NULL, *endptr, newval[128];
  (void)strtod(val, &endptr);
  if(*endptr == '\0') typename = "n";
  if(NULL == typename) {
    long foo, base = 10;
    if(val[0] == '0' && (val[1] == 'x' || val[1] == 'X')) {
      val += 2;
      base = 16;
    } else if (val[0] == '0') {
      base = 8;
    }
    foo = strtol(val, &endptr, base);
    if(*endptr == '\0') {
      typename = "l";
      snprintf(newval, sizeof(newval), "%ld", foo);
      val = newval;
    }
  }
  if(NULL == typename) typename = "s";
  printf("%s:%s\t%s\t%s\n", name, name2, typename, val);
}
static char *trim_clean(char *str) {
  char *cp;
  while(*str && isspace(*str)) str++;
  cp = str;
  while(*cp) {
    if(*cp == '\t') *cp = ' ';
    cp++;
  }
  while(--cp > str) {
    if(isspace(*cp)) *cp = '\0';
    else break;
  }
  return str;
}
int main() {
  FILE *output;
  char buf[256];
  output = popen("/usr/sbin/ipmitool sensor", "r");
  while(NULL != fgets(buf, sizeof(buf), output)) {
    char *col1, *col2, *col3, *col4, *cp;
    cp = buf;
#define EAT_COLUMN(cvar, cp) do { \
  cvar = cp; \
  while(*cp && *cp != '|') cp++; \
  if(!cp) continue; \
  *cp++ = '\0'; \
} while(0)
    EAT_COLUMN(col1, cp);
    EAT_COLUMN(col2, cp);
    EAT_COLUMN(col3, cp);
    EAT_COLUMN(col4, cp);
    col1 = trim_clean(col1);
    col2 = trim_clean(col2);
    col4 = trim_clean(col4);
    cp = col1;
    while(*cp) {
      if(isspace(*cp)) *cp = ':';
       cp++;
    }
    print_line(col1, "value", col2);
    print_line(col1, "status", col4);
  }
  pclose(output);
  return 0;
}
