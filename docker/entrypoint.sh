#!/bin/sh
set -e

mkdir -p /var/run/sshd /work

if [ ! -f /etc/ssh/ssh_host_ed25519_key ]; then
  ssh-keygen -A
fi

if [ ! -f /work/config.yaml ]; then
  cp /opt/reditor/sample.yaml /work/config.yaml
fi

chown -R demo:demo /work

/usr/sbin/sshd

exec runuser -u demo -- node /app/dist/bin.js "$@"
