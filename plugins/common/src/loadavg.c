#include <stdio.h>
#include <stdlib.h>

int getloadavg(double loadavg[], int nelem);

int main() {
  double la[3];
  int i, rv;
  rv = getloadavg(la, 3);
  for(i=0;i<rv;i++) {
    printf("%d\tn\t%f\n", i==0?1:i==1?5:15, la[i]);
  }
  return 0;
}
