#!/bin/sh

PATH=/bin:/usr/bin:/sbin:/usr/sbin:/usr/local/bin

if [ -f /cdrom/services.sh ]; then
    . /cdrom/services.sh
fi

exit 0
