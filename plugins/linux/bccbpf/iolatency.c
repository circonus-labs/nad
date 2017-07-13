#include <stdlib.h>
#include <unistd.h>
//
// Binary setuid wrapper for iolatency.py
//
// We can't use setuid on scripts directly.
//
int main() {
  setuid(geteuid());
  system("/opt/circonus/nad/etc/node-agent.d/linux/bccbpf/iolatency.py");
}
