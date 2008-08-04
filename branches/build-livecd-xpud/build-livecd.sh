#!/bin/bash

export LC_ALL=C
export LANG=C
dir=system

debootstrap --arch i386 hardy ${dir}/ http://tw.archive.ubuntu.com/ubuntu

cp -ap config/* ${dir}/

chroot ${dir}/ mount -t proc proc proc
chroot ${dir}/ dpkg-reconfigure locales
chroot ${dir}/ apt-get update

for i in `cat install.txt`; do 
chroot ${dir}/ apt-get install $i -y --force-yes
done

chroot ${dir}/ dpkg -i lilyterm_0.9.5-1.hardy_i386.deb
rm -f ${dir}/*.deb

umount ${dir}/proc
chroot ${dir}/ apt-get clean
chroot ${dir}/ dpkg -P aptitude gnupg netcat netcat-traditional startup-tasks system-services \
tasksel tasksel-data ubuntu-keyring ubuntu-minimal upstart upstart-compat-sysv upstart-logd
find ${dir}/usr/lib/python2.5/ -name *.py -exec rm -f {} \;

rm -rf ${dir}/var/lib/apt/lists
mkdir -p ${dir}/var/lib/apt/lists/partial

#rm -rf ${dir}/lib/modules/2.6*
#cp -r 2.6* ${dir}/lib/modules/

for i in `cat remove.txt`; do 
rm -rf ${dir}/$i
done

cp -ap post-config/* ${dir}/
cp -ap post-config/.mozilla post-config/.prism ${dir}/

chroot ${dir}/ passwd root <<EOF
xpud
xpud
EOF

./post-config/usr/local/bin/mksquashfs ${dir}/ cdrom/casper/filesystem.squashfs -b 512K
