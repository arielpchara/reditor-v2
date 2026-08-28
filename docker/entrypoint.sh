#!/bin/sh
set -e

mkdir -p /var/run/sshd /work

if [ ! -f /etc/ssh/ssh_host_ed25519_key ]; then
  ssh-keygen -A
fi

if [ ! -f /work/config.yaml ]; then
  cp /opt/reditor/sample.yaml /work/config.yaml
fi

mkdir -p /app/logs /work/.ssh /home/demo/.ssh
chown demo:demo /app/logs

if [ ! -f /work/.ssh/id_ed25519 ]; then
  ssh-keygen -t ed25519 -N '' -f /work/.ssh/id_ed25519
fi
cp /work/.ssh/id_ed25519.pub /home/demo/.ssh/authorized_keys
chmod 700 /work/.ssh /home/demo/.ssh
chmod 600 /work/.ssh/id_ed25519 /home/demo/.ssh/authorized_keys
chown -R demo:demo /work /home/demo/.ssh

/usr/sbin/sshd

exec runuser -u demo -- node /app/dist/bin.js "$@"
