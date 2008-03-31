#!/bin/sh

/etc/init.d/dbus start &
/etc/init.d/udev start &
/etc/init.d/hal start &
/etc/rc.local &
/usr/local/bin/mount-disk.pl &
