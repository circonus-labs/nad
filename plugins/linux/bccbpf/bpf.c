#include <stdlib.h>
#include <unistd.h>
#include <stdio.h>
//
// Binary setuid wrapper for bpf.lua
//
// We can't use setuid on scripts directly.
//
int main() {
  int rc = setuid(0);
  if(rc) {
    fprintf(stderr, "Privilege escalation failed. Is the setuid bit set (chmod u+s bcc.elf)?\n");
    return -1;
  }
  putenv("LUA_PATH=/opt/circonus/nad/etc/node-agent.d/linux/bccbpf/lua/?.lua");
  system("/opt/circonus/nad/etc/node-agent.d/linux/bccbpf/bpf.lua");
  return 0;
}
