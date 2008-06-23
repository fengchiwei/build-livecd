#!/usr/bin/perl

system(qq{sudo perl -pi -e 's/Section "Device"/Section "Device"
Option "HWcursor" "off"/' /etc/X11/xorg.conf}) if `grep nVidia /etc/X11/xorg.conf` && ! `grep HWcursor /etc/X11/xorg.conf` ;
