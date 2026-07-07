# AGENT-DEVSECOPS — Infrastruktur, CI/CD & Keamanan KRIYA

Kamu adalah agent DevSecOps. Baca `KRIYA-MASTER.md` dulu. Teritorimu: **`infra/`** (Terraform), **`.github/workflows/`**, **`helm/`** (chart & values k8s), dan **Dockerfile di tiap service** (boleh disunting, tapi koordinasikan dengan agent pemilik service bila mengubah perilaku build, bukan sekadar hardening image).

Track ini **paralel**, bukan sekuensial dengan M0–M7 — tapi kematangannya (D2 ke atas) baru masuk akal setelah ada aplikasi nyata untuk di-deploy. Jangan membangun cluster produksi untuk sistem yang masih kosong.

## Stack & prinsip

- **CI/CD:** GitHub Actions · registry **GHCR**
- **Security gate:** **Semgrep** (SAST — cek kode sumber) → **Trivy fs** (SCA — cek dependency `go.mod`/`requirements.txt`/`package.json`) → build image → **Trivy image** (cek OS + layer container) — semua sebelum image boleh di-push
- **Orkestrasi:** **k3s** (Kubernetes ringan, single-node) di satu VPS
- **Ingress & TLS:** Traefik (bawaan k3s) + cert-manager (Let's Encrypt)
- **IaC:** **Terraform** — hanya untuk provisioning VPS + DNS. Instalasi k3s via script bash sekali jalan, bukan Ansible (jaga scope tetap satu tool IaC).
- **Observability:** `kube-prometheus-stack` (Prometheus + Grafana + Alertmanager) via Helm, + **Loki/Promtail** untuk log
- **Alerting:** Alertmanager → Telegram (pakai ulang bot Telegram dari eksperimen KKN)
- **Prinsip inti:** pipeline gagal = deploy berhenti. Tidak ada image rentan atau kode gagal scan yang boleh sampai ke cluster. Semua secret lewat GitHub Actions Secrets / Kubernetes Secret — tidak pernah di-commit ke manifest atau file Terraform.

## Struktur teritori

```
infra/
  terraform/           # provisioning VPS + DNS (main.tf, variables.tf, outputs.tf)
  k3s-bootstrap.sh      # script instalasi k3s sekali jalan
helm/
  kriya/                # chart umbrella: templates/ (deployment, service, ingress, configmap)
  values-web.yaml
  values-api.yaml
  values-ai.yaml
  values-n8n.yaml
.github/workflows/
  ci.yml                # lint + SAST + SCA + build + test, jalan di tiap PR
  cd.yml                # build image + Trivy image scan + push GHCR + helm upgrade, jalan di merge ke main
```

## Task per milestone

### D0 — Fondasi CI (bareng M0, murah & langsung jalan)
- [x] Dockerfile multi-stage untuk web, api, ai (kalau agent lain belum buat — koordinasikan, jangan menimpa tanpa izin)
- [x] `ci.yml`: trigger PR ke `main` → job matrix (web/api/ai) → lint + build + unit test tiap service
- [x] Tambahkan **Semgrep** (rule set default) sebagai job terpisah, jalan untuk seluruh repo
- [x] Tambahkan **Trivy fs scan** (dependency) sebagai job terpisah; severity `HIGH,CRITICAL` = gagal, sisanya cuma warning di log

### D1 — Provisioning & cluster (setelah M1–M2 punya sesuatu untuk di-deploy)
- [x] `infra/terraform`: provisioning satu VPS (Hetzner/DigitalOcean — pilih yang tersedia), security group/firewall (buka 22, 80, 443, 6443 secukupnya), DNS record ke domain/subdomain kamu
- [x] `infra/k3s-bootstrap.sh`: instal k3s single-node, ambil `kubeconfig`
- [x] `helm/kriya`: chart dasar (Deployment, Service, ConfigMap, Secret template) untuk web, api, ai, n8n (n8n pakai PersistentVolumeClaim)
- [ ] Deploy manual pertama via `kubectl apply`/`helm install` untuk pastikan chart valid sebelum diotomasi
- [ ] Traefik Ingress + cert-manager (ClusterIssuer Let's Encrypt) → domain punya HTTPS asli

### D2 — CD otomatis (setelah D1 terbukti jalan manual)
- [ ] `cd.yml`: trigger merge ke `main` → build image tiap service yang berubah (pakai `paths:` filter, jangan build semua kalau cuma satu service berubah) → **Trivy image scan** (gagal kalau `CRITICAL`) → push ke GHCR dengan tag git SHA → SSH ke VPS / `helm upgrade` dengan image tag baru
- [ ] Rollback path: dokumentasikan cara `helm rollback` ke revisi sebelumnya
- [ ] Secret produksi (JWT secret, Midtrans key, Gemini key, dsb.) disuntik sebagai Kubernetes Secret dari GitHub Actions Secrets saat deploy — verifikasi tidak ada yang bocor di log CI

### D3 — Observability
- [ ] Install `kube-prometheus-stack` via Helm (namespace `monitoring`)
- [ ] Install Loki + Promtail; sambungkan sebagai datasource di Grafana
- [ ] Dashboard Grafana: request rate & latency per service (web/api/ai), error rate, status pod, penggunaan resource
- [ ] Middleware metrics di Gin & FastAPI (expose `/metrics`) — kalau butuh perubahan di service lain, ajukan lewat "Permintaan lintas-teritori"

### D4 — Alerting
- [ ] Alertmanager: routing ke Telegram (bot + chat ID sebagai secret)
- [ ] Minimal 4 alert rule yang masuk akal: pod crash-loop, error rate API di atas ambang, sertifikat TLS mendekati expired, disk VPS penuh > 85%
- [ ] Uji tiap alert benar-benar terkirim (matikan satu pod sengaja untuk tes, lalu nyalakan lagi)

### D5 — Dokumentasi & demo
- [ ] `docs/devops-architecture.md`: diagram arsitektur (CI/CD, cluster, observability) + penjelasan tiap komponen + keputusan desain (kenapa k3s bukan k8s penuh, kenapa VPS tunggal, dsb.)
- [ ] Rekam demo: push kode kecil → tunjukkan pipeline jalan end-to-end → aplikasi live ter-update → tunjukkan dashboard Grafana → simulasikan alert masuk Telegram
- [ ] README utama repo diperbarui dengan badge status CI dan link demo

## Definition of done (setiap task)
Perubahan infra teruji (Terraform `plan` bersih sebelum `apply`, chart Helm lolos `helm lint`, workflow GitHub Actions hijau di run terakhir), tidak ada secret ter-commit, tidak menyentuh kode aplikasi di luar Dockerfile/metrics middleware yang disepakati, log terisi.

## Larangan spesifik
Jangan commit `kubeconfig`, `.tfstate`, atau file `.env`. Jangan pakai `latest` sebagai tag image di produksi. Jangan tambah tool IaC kedua (Ansible, Pulumi, dst.) tanpa persetujuan — satu Terraform + satu bash script sudah cukup. Jangan biarkan pipeline lanjut deploy kalau salah satu gate keamanan (Semgrep/Trivy) gagal dengan severity tinggi. Jangan ubah kontrak API atau kode bisnis — itu bukan teritorimu.

## Permintaan lintas-teritori
(tulis di sini, format: tanggal — kebutuhan — alasan; lalu berhenti dan tunggu Satria)

## Log
(append satu baris per sesi: `2026-07-07 · [devsecops] task · status/catatan`)
2026-07-08 · [devsecops] inisiasi D0 · selesai membuat Dockerfile web standalone, ci.yml dengan build/test/lint matrix untuk web/api/ai, serta security gates Semgrep dan Trivy fs.
