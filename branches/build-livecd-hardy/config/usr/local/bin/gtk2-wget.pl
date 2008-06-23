#!/usr/bin/perl -w
#
# Gtk+ 2 wrapper for wget, based on Gtk+ 1 ProgressBar example
# by Andrew Flegg <andrew@bleb.org>. Released under the Artistic Licence.

use Gtk2;
use strict;
use vars qw($LIVING $PID);

# -- Deciding what we're going to do... -----------------------
#
my $command = 'wget';
my $uri     = $ARGV[0] or die "syntax: $0 <url>\n";
my $desc    = uri_unescape(length($uri) > 32 ? '...'.substr($uri, -32) : $uri);
$LIVING     = 1;

# -- So we don't need URI::Escape -----------------------------
#
sub uri_unescape {
    my ($val) = @_;

    $val =~ s/%([\da-f]{2})/pack("H*", $1)/egi;
    return $val;
}


# -- Exit on button press -------------------------------------
#
sub exit_gracefully {
    print "Living to 0. Killing $PID...\n";
    kill TERM => $PID;
    kill KILL => $PID if kill 0 => $PID;
    wait;
    print "...done.\n";
    $LIVING = 0;
    Gtk2->main_quit;
    exit;
}

# -- Global objects -------------------------------------------
# 
my $window;
my $button;
my $vbox;
my $label;
my $pbar;
my $log;

# -- Create GUI -----------------------------------------------
# 
Gtk2->init;
$window = Gtk2::Dialog->new("wget: $desc", undef, []);
$window->signal_connect( 'response' => \&exit_gracefully );
$window->signal_connect( 'close'    => \&exit_gracefully );

$vbox = $window->vbox;

$label = new Gtk2::Label( "Downloading $desc" );
$vbox->pack_start( $label, 0, 0, 4 );
$label->show();

$pbar = new Gtk2::ProgressBar();
$vbox->pack_start( $pbar, 0, 0, 10 );
$pbar->set_fraction( 0 );
$pbar->show();

$button = $window->add_button('gtk-cancel' => 'cancel');

$log = new Gtk2::Label();
$log->set_alignment(0, 0);
$vbox->pack_start( $log, 0, 0, 0 );
$log->show();

$vbox->show();

Gtk2->main_iteration while ( Gtk2->events_pending );

$window->show();

# -- Spawn wget -----------------------------------------------
#
$PID = open(IN, "$command $uri -P $ARGV[1] 2>&1 |") or die "Unable to open pipe: $!\n";
my @output = ();
while ($LIVING && (my $line = <IN>)) {
    Gtk2->main_iteration while ( Gtk2->events_pending );

    chomp($line);
    next unless $line;

    if ($line =~ /\.\s*(\d+)%\s/) {
        $pbar->set_fraction( $1 / 100 );
	$line .= "\n" if $1 == 100;

    } elsif ($line and $line !~ /saved/) {
        $pbar->pulse;
	$line = substr($line, 0, 72).'...' if length($line) > 75;
    }

    push @output, $line."\n";
    shift @output if @output > 5;
    $log->set_text(join('',@output));
    Gtk2->main_iteration while ( Gtk2->events_pending );

sleep 10;

}
close(IN);

# -- Update GUI with finished status --------------------------
#
$pbar->set_text( "Download complete" );
$button->set_label("Done");

Gtk2->main;
exit;
