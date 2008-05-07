#!/bin/sh

/etc/rc.local >> /var/log/services.log 2>&1 &
/etc/init.d/udev start >> /var/log/services.log 2>&1 & 
/etc/init.d/dbus start >> /var/log/services.log 2>&1 
/etc/init.d/hal start >> /var/log/services.log 2>&1 

/usr/local/bin/mount-disk.pl >> /var/log/services.log 2>&1 
