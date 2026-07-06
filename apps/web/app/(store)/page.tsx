import Link from "next/link";
import { categories, productList } from "@/lib/fixtures";
import { formatRupiah } from "@/lib/format";

// Home M0 (fixtures): hero, grid 6 kategori, produk terbaru.
export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="py-16 sm:py-24">
        <p className="text-sm font-medium uppercase tracking-widest text-[#c2673f]">
          Furniture flat-pack
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-neutral-900 sm:text-6xl">
          Ruang yang hangat, dirakit oleh tanganmu sendiri.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-neutral-600">
          Katalog furniture per ruangan dengan harga jujur. Cari dengan bahasa
          sehari-hari, temukan yang pas untuk rumahmu.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/kategori/living-room"
            className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Jelajahi katalog
          </Link>
          <Link
            href="/cari"
            className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-800 hover:border-neutral-400"
          >
            Cari furniture
          </Link>
        </div>
      </section>

      <section className="py-8">
        <h2 className="text-xl font-semibold text-neutral-900">
          Belanja per ruangan
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/kategori/${c.slug}`}
              className="group rounded-2xl border border-neutral-200 bg-[#faf7f2] p-6 transition-colors hover:border-[#c2673f]/50"
            >
              <span className="text-lg font-medium text-neutral-900">
                {c.name}
              </span>
              <span className="mt-1 block text-sm text-neutral-500 group-hover:text-[#c2673f]">
                Lihat produk →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-12">
        <h2 className="text-xl font-semibold text-neutral-900">Produk terbaru</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {productList.map((p) => (
            <Link
              key={p.slug}
              href={`/produk/${p.slug}`}
              className="group rounded-2xl border border-neutral-200 p-4 transition-shadow hover:shadow-sm"
            >
              <div className="aspect-[4/5] rounded-xl bg-neutral-100" />
              <p className="mt-3 text-sm font-medium text-neutral-900">{p.name}</p>
              <p className="text-sm text-neutral-500">
                Mulai {formatRupiah(p.price_min)}
              </p>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-sm text-neutral-400">
          Data contoh dari fixtures (M0). Katalog live tersambung pada M1.
        </p>
      </section>
    </div>
  );
}
