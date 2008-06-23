#!/sbin/itype
# This is a i file, used by initng parsed by install_service

# NAME: Clock
# DESCRIPTION: Syncs the hardware clock and system time at startup and shutdown

service system/clock {
	need = system/initial;
	use = system/modules;
	env_file = /etc/default/rcS;

	script start = {
		[ -x /sbin/hwclock ] || exit 0
		[ "${HWCLOCKACCESS}" = "no" ] && exit 0

		setupopts() {
			if [ "${UTC}" = "yes" ]
			then
				myopts="--utc"
				TBLURB="UTC"
			else
				myopts="--localtime"
				TBLURB="Local Time"
			fi

			if [ "${readonly}" = "yes" ]
			then
				myadj="--noadjfile"
			else
				myadj="--adjust"
			fi

			if [ "${SRM}" = "yes" -o "${SRM}" = "true" ]
			then
				myopts="${myopts} --srm"
			fi
			if [ "${ARC}" = "arc" -o "${ARC}" = "true" ]
			then
				myopts="${myopts} --arc"
			fi
			myopts="${myopts} ${CLOCK_OPTS}"

			# Make sure user isn't using rc.conf anymore.
			/bin/grep -qs ^CLOCK= /etc/rc.conf &&
				echo "CLOCK should not be set in /etc/rc.conf but in /etc/conf.d/clock"
		}

		readonly="no"

		if ! touch /etc/adjtime 2>/dev/null
		then
			readonly="yes"
		elif [ ! -s /etc/adjtime ]
		then
			echo "0.0 0 0.0" > /etc/adjtime
		fi

		setupopts

		# Since hwclock always exit's with a 0, need to check its output.
		/sbin/hwclock ${myadj} ${myopts} & 
		/sbin/hwclock --hctosys ${myopts} &
	};

	script stop = {
		[ -x /sbin/hwclock ] || exit 0
		[ "${HWCLOCKACCESS}" = "no" ] && exit 0

		setupopts() {
			if [ "${UTC}" = "yes" ]
			then
				myopts="--utc"
				TBLURB="UTC"
			else
				myopts="--localtime"
				TBLURB="Local Time"
			fi

			if [ "${readonly}" = "yes" ]
			then
				myadj="--noadjfile"
			else
				myadj="--adjust"
			fi

			if [ "${SRM}" = "yes" -o "${SRM}" = "true" ]
			then
				myopts="${myopts} --srm"
			fi
			if [ "${ARC}" = "arc" -o "${ARC}" = "true" ]
			then
				myopts="${myopts} --arc"
			fi
			myopts="${myopts} ${CLOCK_OPTS}"

			# Make sure user isn't using rc.conf anymore.
			/bin/grep -qs ^CLOCK= /etc/rc.conf &&
				echo "CLOCK should not be set in /etc/rc.conf but in /etc/conf.d/clock"
		}

		# Don't tweak the hardware clock on LiveCD halt.
		#[ -n ${CDBOOT} ] && return 0

		#[ ${CLOCK_SYSTOHC} != "yes" ] && return 0

		setupopts

		echo "Syncing system clock to hardware clock [${TBLURB}] ..."
		/sbin/hwclock --systohc ${myopts}
	};
}
