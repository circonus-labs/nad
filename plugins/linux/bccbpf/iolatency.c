#include <stdlib.h>
#include <unistd.h>
#include <stdio.h>
//
// Binary setuid wrapper for iolatency.py
//
// We can't use setuid on scripts directly.
//
int main() {
  int rc = setuid(0);
  if(rc) {
    fprintf(stderr, "Privilege escalation failed. Is the setuid bit set (chmod u+s iolatency.elf)?\n");
    return -1;
  }
  system("/opt/circonus/nad/etc/node-agent.d/linux/bccbpf/iolatency.py");
  return 0;
}
