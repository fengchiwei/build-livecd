# mkliveusb.pm - PUD GNU/Linux USB Installer (package)
# Copyright 2007 by Pin-Shiun Chen (penkia) <penkia@gmail.com>.
# This program is free software; you can redistribute it and/or modify it under the same terms as Perl itself.
# See http://www.perl.com/perl/misc/Artistic.html

use encoding 'utf8';
use Tie::File;
use Gtk2::Helper;

# main package

package mkliveusb;

use strict;
use Exporter;
use vars qw(@EXPORT_OK);
@EXPORT_OK = qw($gladexml);
use vars qw($gladexml);
our($d, $PUD_BOOT_APPEND, $DELETE, $PUDDING, $TARGET, $BACKUP);

use Gtk2 '-init';
use Gtk2::GladeXML;

$gladexml = Gtk2::GladeXML->new('/usr/local/share/mkliveusb/mkliveusb.glade');
callbacks::init();
$gladexml->signal_autoconnect_from_package('callbacks');

1;

#############################################################

# Callback functions 

package callbacks;

use Locale::gettext; # for i18n
use POSIX;
setlocale(LC_ALL, "");

use strict;
use vars qw($gladexml);

sub _ { $d->get(@_) } # to gettext

#############################################################

sub init {

# use /usr/share/locale/*/LC_MESSAGES/mkliveusb.mo
$d = Locale::gettext->domain('mkliveusb');

$gladexml = $mkliveusb::gladexml;

# gettext in glade is too hard to me, so I put the string handle here:
$gladexml->get_widget('label2')->set_markup(_("<span font_desc='16' weight='bold'>PUD LiveUSB Installer</span>  v0.2"));
$gladexml->get_widget('label3')->set_text(_("Install onto:"));
$gladexml->get_widget('label4')->set_text(_("Backup size limit:"));
$gladexml->get_widget('label6')->set_text(_("MB (Partition Size)"));
$gladexml->get_widget('label5')->set_text(_("Advanced Options"));
$gladexml->get_widget('checkbutton1')->set_label(_("Backup user data when finished"));
$gladexml->get_widget('checkbutton2')->set_label(_("Find and install Opt-Get plugins"));
$gladexml->get_widget('checkbutton3')->set_label(_("Commands to execute:"));

$gladexml->get_widget('label7')->set_text(_("(While booting to X)"));
$gladexml->get_widget('checkbutton4')->set_label(_("Booting parameters"));
$gladexml->get_widget('button2')->set_label(_("Install"));
$gladexml->get_widget('button3')->set_label(_("Cancel"));

$gladexml->get_widget('button5')->set_label(_("Okay"));

$gladexml->get_widget('label16')->set_markup(_("Note: The following steps will format the seleted device,\n".
"It's highly recommended to make a backup, if there's an important data;\n".
"This program is still underdeveloped, use at your own risk.\n".
"\n".
"Click <span weight='bold'>I'm Sure</span> to continue, <span weight='bold'>Cancel</span> to previous screen.\n"));

$gladexml->get_widget('button6')->set_label(_("I'm Sure"));
$gladexml->get_widget('button7')->set_label(_("Cancel"));
$gladexml->get_widget('label17')->set_text(_("Install successful."));

# get the device list by fdisk
for (`fdisk -l`) {
	next unless /^Disk \/dev\/(s.*?):\s(.*?),/g;
	$gladexml->get_widget('combobox1')->append_text("/dev/$1, ($2)\n");
}

# start the main dialog
$gladexml->get_widget('dialog1')->show;

}

#############################################################

sub on_dialog1_destroy {
Gtk2->main_quit;
}

sub on_dialog1_close {
Gtk2->main_quit;
}

sub on_cancel_clicked {
Gtk2->main_quit;
}


#############################################################

sub on_makesure_clicked {
$gladexml->get_widget('dialog4')->hide;

# partition

my $count;
for(`fdisk -l`) {
$count++ if /^$TARGET/g;
}
$DELETE = "";
$DELETE .= "d\n$_\n" for (1..$count-1);
$DELETE .= "d\n\n";

$BACKUP = $gladexml->get_widget('spinbutton1')->get_value_as_int;

open(F, "| fdisk $TARGET") or die "$!\n";

print F <<EOF;
$DELETE
n
p
2
1
+${BACKUP}M
n
p
1


a
1
t
1
6
w

EOF

close(F);

open(F, "| fdisk $TARGET") or die "$!\n";

print F <<EOF;
d
1
d

n
p
2
1
+${BACKUP}M
n
p
1


a
1
t
1
6
w

EOF

close(F);

# format the partitions

$TARGET =~ s/\/dev\///;

sleep 3;
system("umount /dev/${TARGET}1");
!system("mkfs.vfat -F 32 -n pud /dev/${TARGET}1") or die "$!\n";

sleep 3;
system("umount /dev/${TARGET}2");
!system("mkfs.ext2 -b 4096 -L pud-backup /dev/${TARGET}2") or die "$!\n";

sleep 3;
system("umount /dev/${TARGET}1");
system("umount /dev/${TARGET}2");

# copy files from cdrom

!system("mkdir -p /mnt/${TARGET}1") or die "$!\n";
!system("mount /dev/${TARGET}1 /mnt/${TARGET}1") or die "$!\n";

!system("cp -r /cdrom/* /mnt/${TARGET}1") or die "$!\n";

# check if set the booting paramter

$gladexml->get_widget('checkbutton4')->get_active;
if ($gladexml->get_widget('checkbutton4')->get_active) {
$PUD_BOOT_APPEND = $gladexml->get_widget('entry1')->get_text;

tie my @syslinux, 'Tie::File', '/usr/local/share/mkliveusb/syslinux.cfg' or die "$!\n";
for (@syslinux) {
s/PUD_BOOT_APPEND/$PUD_BOOT_APPEND/;
s/default linux/default custom/;
}

}

!system("cp /usr/local/share/mkliveusb/syslinux.cfg /mnt/${TARGET}1/") or die "$!\n";

# find and copy opt-get plugins

$gladexml->get_widget('checkbutton2')->get_active;
if ($gladexml->get_widget('checkbutton2')->get_active) {
my ($opt_path) =  (`cat /proc/cmdline` =~ /opt=(.*?)(\/?)(\s|$)/ig);
system("cp -a ${opt_path}/* /mnt/${TARGET}1/opt/") if -e "${opt_path}";
}

# copy self defined pudding.sh 

$gladexml->get_widget('checkbutton3')->get_active;
if ($gladexml->get_widget('checkbutton3')->get_active) {
$PUDDING = $gladexml->get_widget('entry2')->get_text;
!system(qq{echo "$PUDDING" > /mnt/${TARGET}1/pudding.sh}) or die "$!\n";
}

# install bootloader

!system("syslinux /dev/${TARGET}1") or die "$!\n";

# use pudata to backup data

$gladexml->get_widget('checkbutton1')->get_active;

if ($gladexml->get_widget('checkbutton1')->get_active) {

my ($ori_save) = `grep save /etc/pudata/pudata.conf` =~ /save=(.*?)(\s|$)/ig;
!system(qq{perl -pi -e "s/^eject/#eject/g" /etc/init.d/casper}) or die "$!\n";
!system("mkdir -p /mnt/${TARGET}2") or die "$!\n";
!system("mount /dev/${TARGET}2 /mnt/${TARGET}2") or die "$!\n";
!system(qq{perl -pi -e "s#^save=.*#save=/mnt/${TARGET}2/#g" /etc/pudata/pudata.conf}) or die "$!\n";
!system("pudata save") or die "$!\n";
!system(qq{perl -pi -e "s#^save=.*#save=$ori_save#g" /etc/pudata/pudata.conf}) or die "$!\n";

}

# done, show successful dialog

$gladexml->get_widget('dialog5')->show;

}


#############################################################

sub on_button8_clicked {
Gtk2->main_quit;
}

sub on_button8_destroy {
Gtk2->main_quit;
}

# confirmed and error check

sub on_install_clicked {

$TARGET = (split(/,/, $gladexml->get_widget('combobox1')->get_active_text))[0];

if ($TARGET =~ /\w/) {

$gladexml->get_widget('dialog1')->hide;

my $desc = $gladexml->get_widget('label16')->get_label;
$desc = "<span font_desc='14' weight='bold'>"._("Install PUD onto"). " $TARGET ...</span>\n\n$desc";
$gladexml->get_widget('label16')->set_markup($desc);

$gladexml->get_widget('dialog4')->show;

} else {
&error_msg(_("Please select a target device")); 
}

}

# error message dialog

sub error_msg {
my $msg = shift;
$gladexml->get_widget('label14')->set_text($msg);
$gladexml->get_widget('dialog3')->show;
return 0;
}

sub on_errchk_clicked {
$gladexml->get_widget('dialog3')->hide;
}

sub on_back_clicked {
$gladexml->get_widget('dialog2')->hide;
$gladexml->get_widget('dialog1')->show;
}

sub on_goback_clicked {
$gladexml->get_widget('dialog4')->hide;
$gladexml->get_widget('dialog1')->show;
}

1; 
