# Arsitektur DevOps KRIYA

Dokumen ini mendefinisikan infrastruktur, CI/CD pipeline, dan arsitektur observabilitas untuk proyek e-commerce KRIYA.

## 1. Arsitektur Infrastruktur (Cluster)
Sistem dideploy di sebuah server tunggal (VPS) Hetzner (rekomendasi tipe `cx22` dengan 2 vCPUs dan 4GB RAM) yang menjalankan **k3s** (Kubernetes ringan).

- **Ingress Controller:** Traefik (bawaan k3s) menangani routing HTTP/HTTPS.
- **TLS/HTTPS:** `cert-manager` dipasangkan dengan Let's Encrypt untuk otomatisasi pembaruan sertifikat.
- **Kubernetes Resources:** Semua aplikasi dideploy menggunakan chart Helm bernama `kriya`.
  - **web (Next.js):** 2 Replicas, standalone runner.
  - **api (Go-Gin):** 2 Replicas, port 8080.
  - **ai (FastAPI):** 2 Replicas, port 8000.
  - **n8n (Automation):** 1 Replica + Persistent Volume untuk database SQLite internal.

## 2. Alur CI/CD (GitHub Actions)
Pipeline terbagi menjadi dua bagian utama:
1. **CI Pipeline (`ci.yml`):**
   - Dicuatkan ketika ada Pull Request ke branch `main`.
   - Melakukan testing, linting, dan validasi kode untuk web, api, dan ai secara paralel.
   - **Semgrep SAST:** Memeriksa kerentanan kode di seluruh repositori.
   - **Trivy SCA:** Memeriksa kerentanan dependency (go.mod, package.json, requirements.txt).
2. **CD Pipeline (`cd.yml`):**
   - Dicuatkan ketika ada commit langsung atau merge PR ke `main`.
   - Menggunakan dynamic path filtering untuk mendeteksi layanan mana yang berubah dan hanya membuild layanan tersebut.
   - **Trivy Image Scan:** Memeriksa kerentanan image Docker yang dibuild; jika ditemukan kerentanan berlevel `CRITICAL`, rilis langsung digagalkan.
   - **Push ke GHCR:** Menyimpan image dengan tag git commit SHA.
   - **Helm Upgrade:** Melakukan deployment tanpa downtime (RollingUpdate) pada klaster Kubernetes tujuan.

## 3. Observabilitas & Alerting
- **Kube-Prometheus-Stack:** Menyediakan server Prometheus untuk menarik metrik dan Grafana sebagai antarmuka grafik visualisasi data.
- **Loki & Promtail:** Bertugas sebagai pengumpul log kontainer terpusat untuk kemudian dikueri melalui Grafana.
- **Alertmanager:** Mengarahkan peringatan (seperti kegagalan sistem, resource menipis, dsb.) langsung ke Telegram Bot.
