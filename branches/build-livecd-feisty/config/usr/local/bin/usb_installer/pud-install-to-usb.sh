#!/bin/sh
# pud-install-to-usb.sh - PUD GNU/Linux USB Installer (shell script)
# Copyright 2007 by Pin-Shiun Chen (penkia) <penkia@gmail.com>.
# This program is free software; you can redistribute it and/or modify it under the same terms as Perl itself.
# See http://www.perl.com/perl/misc/Artistic.html


TARGET=$1
BACKUP=$2
DELETE=`cat /tmp/delete.tmp`

echo "確定刪除所有檔案並安裝 PUD GNU/Linux? 請輸入 yes 或 no "
read ans
if [ $ans = "yes" ] || [ $ans = "YES" ]; then

echo "在 /dev/$TARGET 建立分割區"

fdisk /dev/${TARGET} << EOF
${DELETE}
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

umount /dev/${TARGET}1
umount /dev/${TARGET}2

echo "格式化 /dev/$TARGET"

mkfs.vfat -F 32 -n pud /dev/${TARGET}1
mkfs.ext2 -b 4096 -L pud-backup /dev/${TARGET}2

umount /dev/${TARGET}1
umount /dev/${TARGET}2

echo "掛載 /dev/${TARGET}1"

mkdir -p /mnt/${TARGET}1
mount /dev/${TARGET}1 /mnt/${TARGET}1

echo "將檔案複製到 /mnt/${TARGET}1"

cp -r /cdrom/* /mnt/${TARGET}1
cp /tmp/syslinux.cfg.tmp /mnt/${TARGET}1/syslinux.cfg

echo "安裝所有搜尋到的 Opt-Get 外掛"

for x in $(cat /proc/cmdline); do
        case $x in
        opt=*)
                opt=${x#opt=}
                ;;
        esac
done

cp ${opt}/*.opt /mnt/${TARGET}1/opt/

echo "複製開機後命令檔"

if [ -e /tmp/pudding.sh ]; then 
    cp /tmp/pudding.sh /mnt/${TARGET}1/
fi

echo "安裝 syslinux"

umount /dev/${TARGET}1
umount /dev/${TARGET}2
syslinux /dev/${TARGET}1

echo "進行第一次設定儲存"

perl -pi -e "s/^eject/#eject/g" /etc/init.d/casper

mkdir -p /mnt/${TARGET}2
mount /dev/${TARGET}2 /mnt/${TARGET}2
perl -pi -e "s#^save=.*#save=/mnt/${TARGET}2/#g" /etc/pudata/pudata.conf
pudata save
perl -pi -e "s#^save=.*#save=auto#g" /etc/pudata/pudata.conf

echo "安裝完成! 按任意鍵結束"
read a

else 

echo "取消安裝"

fi
