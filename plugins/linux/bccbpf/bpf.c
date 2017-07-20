#include <stdlib.h>
#include <unistd.h>
//
// Binary setuid wrapper
//
// We can't use setuid on scripts directly.
//
int main() {
  setuid(geteuid());
  putenv("LUA_PATH=/opt/circonus/nad/etc/node-agent.d/linux/bccbpf/lua/?.lua");
  system("/opt/circonus/nad/etc/node-agent.d/linux/bccbpf/bpf.lua");
}
