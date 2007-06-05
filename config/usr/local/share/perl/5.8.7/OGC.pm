# Main package

package OGC; 
use strict;
use Exporter;
use vars qw(@EXPORT_OK);
@EXPORT_OK = qw($gladexml);
use vars qw($gladexml);
use Gtk2 '-init';
use Gtk2::GladeXML;
$gladexml = Gtk2::GladeXML->new('/usr/local/bin/ogc.glade');

our($filename, $path);
callbacks::init();
$gladexml->signal_autoconnect_from_package('callbacks');
1;

# Callback functions

package callbacks;
use strict;
use vars qw(@EXPORT_OK);
use vars qw($gladexml);
use File::Basename;

sub init {
$gladexml = $OGC::gladexml;
chomp ($filename = basename(`cat /tmp/.opt-get-client`));
$gladexml->get_widget('filechooserdialog1')->set_current_name($filename);
$gladexml->get_widget('filechooserdialog1')->show;
}

sub on_filechooserdialog1_destroy {
Gtk2->main_quit;
}

sub on_button1_clicked {

$gladexml->get_widget('filechooserdialog1')->hide;

$path = $gladexml->get_widget('filechooserdialog1')->get_current_folder;

$ARGV[0] =~ s/opt-get/ftp/;
!system("sudo gtk2-wget.pl $ARGV[0] $path") or die "$!\n";

$gladexml->get_widget('label2')->set_label(`sudo opt-get install $path/$filename`);

$gladexml->get_widget('dialog1')->show;

}

sub on_button2_clicked {
Gtk2->main_quit;
}

sub on_button3_clicked {
Gtk2->main_quit;
}

sub on_dialog1_destroy {
Gtk2->main_quit;
}

sub on_dialog1_close {
Gtk2->main_quit;
}


1; 

