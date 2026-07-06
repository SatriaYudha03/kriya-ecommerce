/**
 * Format harga integer rupiah menjadi "Rp1.250.000".
 * Kontrak: harga selalu integer rupiah tanpa sen (KRIYA-MASTER.md Bagian 5).
 */
export function formatRupiah(value: number): string {
  return "Rp" + new Intl.NumberFormat("id-ID").format(Math.round(value));
}
