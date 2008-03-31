#!/sbin/itype
# This is a i file, used by initng parsed by install_service

# NAME: udev
# DESCRIPTION: The Linux Userspace Device filesystem
# WWW: http://www.kernel.org/pub/linux/utils/kernel/hotplug/udev.html

virtual system/udev {
	critical;
	need = system/udev/filldev system/udev/udevd;
	also_start = system/udev/move_rules system/udev/retry_failed;
}

# start the udev daemon
daemon system/udev/udevd {
	critical;
	need = system/udev/mountdev system/initial/mountvirtfs;
	respawn;
	exec daemon = /sbin/udevd;
}

# copy the rules generated before / was mounted read-write
service system/udev/move_rules {
	need = system/udev/udevd system/mountroot/rootrw;
	script start = {
		for file in /dev/.udev/tmp-rules--*
		do
			dest=${file##*tmp-rules--}
			[ "$dest" = '*' ] && break
			{
				/bin/cp $file /etc/udev/rules.d/$dest
				rm -f $file
			} &
		done
		wait
	};
}

service system/udev/retry_failed {
	need = system/udev/udevd system/mountfs/essential system/udev/move_rules;
	script start = {
		[ -x "/sbin/udevtrigger" ] || exit 0

		# Check if it supports the --retry-failed argument before
		# calling.
		/sbin/udevtrigger --help 2>&1 | grep -q -- --retry-failed &&
		/sbin/udevtrigger --retry-failed
		exit 0
	};
}

service system/udev/mountdev {
	critical;
	need = system/initial/mountvirtfs;
	script start = {
		error() {
			echo "${*}" >&2
			exit 1
		}

		[ -e /proc/filesystems ] || error "udev requires a mounted procfs, not started."
		/bin/grep -q '[[:space:]]tmpfs$' /proc/filesystems || error "udev requires tmpfs support, not started."
		[ -d /sys/block ] || error "udev requires a mounted sysfs, not started."

		# mount a tmpfs over /dev, if somebody did not already do it
		/bin/grep -Eq "^[^[:space:]]+[[:space:]]+/dev[[:space:]]+tmpfs[[:space:]]+" /proc/mounts && exit 0

		# /dev/.static/dev is used by MAKEDEV to access the real /dev directory.
		# /etc/udev is recycled as a temporary mount point because it's the only
		# directory which is guaranteed to be available.
		/bin/mount -n --bind /dev /etc/udev
		if ! /bin/mount -n -o size=$tmpfs_size,mode=0755 -t tmpfs udev /dev
		then
			/bin/umount -n /etc/udev
			error "udev in /dev his own filesystem (tmpfs), not started."
		fi
		/bin/mkdir -p /dev/.static/dev
		/bin/chmod 700 /dev/.static/
		/bin/mount -n --move /etc/udev /dev/.static/dev

		# Make some default static onces, so we are sure they will exist.
		/bin/mknod -m0666 /dev/null c 1 3
		/bin/mknod -m0666 /dev/zero c 1 5
		/bin/mknod /dev/console c 5 1

		# Send SIGHUP to initng, will reopen /dev/initctl and /dev/initng.
		# we can't assume that initng has pid 1, e.g. when booting from initrd
		/usr/bin/killall -HUP initng

		exit 0
	};
}

# fill /dev
service system/udev/filldev {
	critical;
	need = system/udev/udevd;

	script start = {
#		if [ -e /etc/udev/links.conf ]
#		then
#			/bin/grep '^[^#]' /etc/udev/links.conf | \
#			while read type name arg1
#			do
#				[ "${type}" -a "${name}" -a ! -e "/dev/${name}" -a ! -L "/dev/${name}" ] || continue
#				case "${type}" in
#					L) /bin/ln -snf ${arg1} /dev/${name} & ;;
#					D) /bin/mkdir -p /dev/${name} ;;
#					M) /bin/mknod --mode=600 /dev/${name} ${arg1} &;;
#					*) echo "/etc/udev/links.conf: unparseable line (${type} ${name} ${arg1})" ;;
#				esac
#			done
#		fi


		# Copy contents of /etc/udev/devices and /lib/udev/devices
#	        for devdir in /etc/udev/devices /lib/udev/devices; do
#        	        if [ -d "$devdir" ]
#			then
#			{
#               			cd $devdir &&
#				tar c . | tar x --directory=/dev/
#			} &
#			fi
#		done

cd /lib/udev/devices && tar c . | tar x --directory=/dev/ &

#		if [ ! -e /etc/udev/links.conf -a ! -d /lib/udev/devices ]
#		then
#			# Some manually, just to be sure.
#			/bin/ln -snf /proc/self/fd /dev/fd &
#			/bin/ln -snf fd/0 /dev/stdin &
#			/bin/ln -snf fd/1 /dev/stdout &
#			/bin/ln -snf fd/2 /dev/stderr &
#			/bin/ln -snf /proc/kcore /dev/core &
#			/bin/ln -snf /proc/asound/oss/sndstat /dev/sndstat &
#		fi

		# which system provides udevsynthesize? gentoo does not.
		# and which provides udevplug? gentoo does not, too.
		# udevtrigger is available since udev 088
		# udevsettle is available since udev 090

		if [ -x "/sbin/udevtrigger" -a -x "/sbin/udevsettle" ]
		then
    			# if this directories are not present /dev will not be updated by udev
    			/bin/mkdir -p /dev/.udev/db/ /dev/.udev/queue/

			# send hotplug events
			/sbin/udevtrigger

			# wait for the udevd childs to finish
			/sbin/udevsettle --timeout=300 & 

		elif [ -x "/sbin/udevsynthesize" ]
		then
			# run syntesizers that will make hotplug events for every
			# devices that is currently in the computer, that will
			# create all dev files.

			udevd_timeout=300
			echo "Running /sbin/udevsynthesize to populate /dev ..."
			/bin/mkdir -p /dev/.udev/db /dev/.udev/queue /dev/.udevdb

			/sbin/udevsynthesize

			# wait for the udevd childs to finish
			echo "Waiting for /dev to be fully populated ..."
			while [ -d /dev/.udev/queue/ -a ${udevd_timeout} -ne 0 ]
			do
				sleep .2
				udevd_timeout=$((${udevd_timeout}-1))
			done
		elif [ -x "/sbin/udevplug" ]
		then
			/sbin/udevplug
		elif [ -x "/sbin/udevstart" ]
		then
			udevd_timeout=60
			/sbin/udevstart

			# wait for the udevd childs to finish
			echo "Waiting for /dev to be fully populated ..."
			while [ -d /dev/.udev/queue/ -a ${udevd_timeout} -ne 0 ]
			do
				sleep .2
				udevd_timeout=$((${udevd_timeout}-1))
			done
		fi
		chmod 0666 /dev/null

		if [ -e /sbin/MAKEDEV ]
		then
			ln -sf /sbin/MAKEDEV /dev/MAKEDEV
		else
			ln -sf /sbin/true /dev/MAKEDEV
		fi
	};
}
