#!bash
OHAI=`which ohai`
SHEBANG=`head -1 $OHAI`
export RUBY_BIN=`echo $SHEBANG | sed -e 's/#!//'`
