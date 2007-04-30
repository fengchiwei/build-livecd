# usb_install.pm - PUD GNU/Linux USB Installer (package)
# Copyright 2007 by Pin-Shiun Chen (penkia) <penkia@gmail.com>.
# This program is free software; you can redistribute it and/or modify it under the same terms as Perl itself.
# See http://www.perl.com/perl/misc/Artistic.html

####################################
### Main package ##
####################################

our($dialog1, $combobox1, $spinbutton1, $checkbutton1, $checkbutton2, $entry1, $entry2, $PUD_BOOT_APPEND, $DELETE, $PUDDING, $TARGET, $BACKUP);

package usb_installer;

use strict ;

use Exporter;
use vars qw(@EXPORT_OK);
@EXPORT_OK = qw($gladexml);
use vars qw($gladexml);

use Gtk2 '-init';
use Gtk2::GladeXML;

$gladexml = Gtk2::GladeXML->new('/tmp/usb_installer.glade.tmp');
callbacks::init();
$gladexml->signal_autoconnect_from_package('callbacks');

1;

################################
### Callback functions ##
################################

package callbacks;

use strict;

use vars qw($gladexml);

sub init {
$gladexml = $usb_installer::gladexml;
$dialog1 = $gladexml->get_widget('dialog1');
$dialog1->show;

}

sub on_dialog1_destroy {
Gtk2->main_quit;
}

sub on_dialog1_close {
Gtk2->main_quit;
}

sub on_cancel_clicked {
Gtk2->main_quit;
}

sub on_install_clicked {

$dialog1->run;

$combobox1 = $gladexml->get_widget('combobox1');
$TARGET = (split(/,/, $combobox1->get_active_text))[0];
my $count;
for(`fdisk -l`) {
$count++ if /^$TARGET/g;
}
$DELETE .= "d\n$_\n" for (1..$count-1);
$DELETE .= "d\n\n";
!system(qq{echo "$DELETE" > /tmp/delete.tmp}) or die "$!\n";

$TARGET = $1 if (split(/,/, $combobox1->get_active_text))[0] =~ /^\/dev\/(.*)/;

$spinbutton1 = $gladexml->get_widget('spinbutton1');
$BACKUP = $spinbutton1->get_value_as_int;

$checkbutton1 = $gladexml->get_widget('checkbutton1');
$checkbutton2 = $gladexml->get_widget('checkbutton2');

$checkbutton1->get_active;
if ($checkbutton1->get_active) {
$entry1 = $gladexml->get_widget('entry1');
$PUD_BOOT_APPEND = $entry1->get_text;

tie my @syslinux, 'Tie::File', '/tmp/syslinux.cfg.tmp' or die "$!\n";

for (@syslinux) {
s/PUD_BOOT_APPEND/$PUD_BOOT_APPEND/;
s/default linux/default custom/;
}

}

$checkbutton2->get_active;
if ($checkbutton2->get_active) {
$entry2 = $gladexml->get_widget('entry2');
$PUDDING = $entry2->get_text;
!system(qq{echo "$PUDDING" > /tmp/pudding.sh}) or die "$!\n";

}

print "$TARGET $BACKUP\n$DELETE";
$dialog1->hide;

!system(qq{xfce4-terminal -e "./pud-install-to-usb.sh $TARGET $BACKUP" &}) or die "$!\n";

Gtk2->main_quit;

}

sub on_dialog1_response {
#my  ($name, $response) = @_;
#print $response, "\n" ;
#my $dialog1 = $gladexml->get_widget('dialog1');
#$dialog1->hide; 
}

1; 
