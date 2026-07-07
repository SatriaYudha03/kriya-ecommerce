#!/bin/bash
set -euo pipefail

# K3s Bootstrap Script
# Script ini dijalankan sekali di server target untuk menyiapkan K3s dengan Traefik.

echo "=== Updating system packages ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get upgrade -y

echo "=== Installing basic dependencies ==="
apt-get install -y curl ufw open-iscsi

echo "=== Configuring firewall ==="
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 6443/tcp
ufw --force enable

echo "=== Installing K3s ==="
# Instal K3s tanpa Service LB bawaan (kita gunakan Traefik bawaan)
curl -sfL https://get.k3s.io | sh -s - \
  --write-kubeconfig-mode 644 \
  --disable servicelb

echo "=== Installing cert-manager ==="
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml

echo "=== Waiting for cert-manager API ==="
sleep 20

echo "=== Installing Let's Encrypt ClusterIssuer ==="
# Gunakan manual apply dari repo setelah VM running
# kubectl apply -f /var/lib/rancher/k3s/server/manifests/letsencrypt-issuer.yaml

echo "=== Verifying installation ==="
sleep 10
kubectl get nodes

echo "=== K3s Bootstrap Complete! ==="
echo "Kubeconfig is available at /etc/rancher/k3s/k3s.yaml"
echo "Copy it to your local machine and replace server IP with this node's public IP."
