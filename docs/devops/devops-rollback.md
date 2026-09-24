# KRIYA DevOps Rollback Guide

Jika terjadi kegagalan setelah deployment otomatis melalui CD pipeline, gunakan salah satu dari cara berikut untuk melakukan rollback sistem ke kondisi stabil sebelumnya.

## 1. Rollback via Helm (Direkomendasikan)
Helm menyimpan riwayat rilis setiap kali perintah `helm upgrade` dijalankan.

### Cek Riwayat Rilis
Tampilkan riwayat revisi chart `kriya` di namespace `default`:
```bash
helm history kriya
```

### Rollback ke Revisi Sebelumnya
Gunakan perintah `helm rollback` diikuti dengan nomor revisi target (misal: revisi 5):
```bash
helm rollback kriya 5
```

---

## 2. Rollback Manual dengan Git SHA Tag
Jika pipeline CD gagal di tengah jalan tetapi image baru sudah terlanjur di-push ke GHCR dan Anda ingin memperbarui tag image secara spesifik ke commit Git yang stabil sebelumnya.

```bash
helm upgrade kriya ./helm/kriya \
  --set web.image.tag=<GIT_SHA_STABLE> \
  --set api.image.tag=<GIT_SHA_STABLE> \
  --set ai.image.tag=<GIT_SHA_STABLE> \
  --reuse-values
```
