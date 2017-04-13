#include <kstat.h>
#include <stdio.h>
#include <unistd.h>
#include <strings.h>
#include <inttypes.h>
#include <sys/sysinfo.h>

#define CSSUM(name) sum.cpu_sysinfo.name += cpu.cpu_sysinfo.name

int main(int argc, char **argv) {
  kstat_ctl_t   *kc;
  kstat_t       *ksp;
  kstat_io_t     kio;
  kstat_named_t *knp;
  int ncpus = 0;
  long scale;
  cpu_stat_t sum;
  cpu_stat_t cpu;

  /* scale for clock frequency */
  scale = sysconf(_SC_CLK_TCK)/100;
  memset(&sum, 0, sizeof(sum));
  kc = kstat_open();
  ksp = kstat_lookup(kc, "cpu_stat", -1, NULL);
  for (; ksp != NULL; ksp = ksp->ks_next) {
    if(!strcmp(ksp->ks_module, "cpu_stat")) {
      ncpus++;
      kstat_read(kc,ksp,&cpu);
      CSSUM(cpu[CPU_IDLE]);
      CSSUM(cpu[CPU_USER]);
      CSSUM(cpu[CPU_KERNEL]);
      CSSUM(cpu[CPU_WAIT]);
      CSSUM(wait[W_IO]);
      CSSUM(intr);
      CSSUM(inv_swtch);
      CSSUM(pswitch);
      CSSUM(syscall);
    }
  }

  /*
   * Some stats are not implemented (yet), so make them zero.
   */
  printf("%s\tL\t%llu\n", "user", sum.cpu_sysinfo.cpu[CPU_USER]/ncpus/scale);
  printf("%s\tL\t%llu\n", "user`normal", sum.cpu_sysinfo.cpu[CPU_USER]/ncpus/scale);
  printf("%s\tL\t%llu\n", "user`nice", 0);
  printf("%s\tL\t%llu\n", "kernel", sum.cpu_sysinfo.cpu[CPU_KERNEL]/ncpus/scale);
  printf("%s\tL\t%llu\n", "kernel`sys", sum.cpu_sysinfo.cpu[CPU_KERNEL]/ncpus/scale);
  printf("%s\tL\t%llu\n", "kernel`guest", 0);
  printf("%s\tL\t%llu\n", "kernel`guest_nice", 0);
  printf("%s\tL\t%llu\n", "idle", sum.cpu_sysinfo.cpu[CPU_IDLE]/ncpus/scale);
  printf("%s\tL\t%llu\n", "idle`normal", sum.cpu_sysinfo.cpu[CPU_IDLE]/ncpus/scale);
  printf("%s\tL\t%llu\n", "idle`steal", 0);
  printf("%s\tL\t%llu\n", "wait_io", sum.cpu_sysinfo.wait[W_IO]);
  printf("%s\tL\t%llu\n", "intr", sum.cpu_sysinfo.intr);
  /* We do not distinguish hard from soft interrupts on illumos */
  printf("%s\tL\t%s\n", "intr`hard", "[[null]]");
  printf("%s\tL\t%s\n", "intr`soft", "[[null]]");
  printf("%s\tL\t%llu\n", "context_switch", (sum.cpu_sysinfo.inv_swtch + sum.cpu_sysinfo.pswitch));
  printf("%s\tL\t%llu\n", "syscall", sum.cpu_sysinfo.syscall);

  return 0;
}
