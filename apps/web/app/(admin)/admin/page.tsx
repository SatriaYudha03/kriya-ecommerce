export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
      <div className="mt-6 grid grid-cols-3 gap-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Total Pesanan</p>
          <p className="mt-2 text-3xl font-semibold text-neutral-900">128</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Pendapatan</p>
          <p className="mt-2 text-3xl font-semibold text-neutral-900">Rp45.2M</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Produk Aktif</p>
          <p className="mt-2 text-3xl font-semibold text-neutral-900">24</p>
        </div>
      </div>
    </div>
  );
}
