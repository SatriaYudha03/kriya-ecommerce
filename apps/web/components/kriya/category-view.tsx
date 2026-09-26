"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { categoryLabel } from "@/lib/category-meta";
import { useCategories, useProducts } from "@/lib/catalog/queries";
import { Breadcrumbs } from "./breadcrumbs";
import { EmptyState } from "./empty-state";
import { FilterBar, pricePresets, type SortValue } from "./filter-bar";
import { Pagination } from "./pagination";
import { ProductGrid, ProductGridSkeleton } from "./product-grid";
import { useLanguage } from "./language-provider";

const LIMIT = 6;
const SORTS: SortValue[] = ["newest", "price_asc", "price_desc"];

// Halaman listing kategori. Filter (harga, urut) & halaman disimpan di URL agar
// bisa di-share dan di-refresh. Data lewat TanStack Query -> fetcher lib/api.
export function CategoryView({ slug }: { slug: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sortParam = searchParams.get("urut");
  const sort: SortValue = SORTS.includes(sortParam as SortValue)
    ? (sortParam as SortValue)
    : "newest";
  const hargaParam = searchParams.get("harga");
  const priceKey = pricePresets.some((p) => p.key === hargaParam) ? hargaParam! : "all";
  const page = Math.max(1, Number(searchParams.get("hal")) || 1);
  const onSale = searchParams.get("sale") === "1";
  const preset = pricePresets.find((p) => p.key === priceKey)!;

  const { locale, t } = useLanguage();
  const { data: categories } = useCategories();
  
  const currentCategory = categories?.find((c) => c.slug === slug);
  const name = currentCategory?.name ?? categoryLabel(slug, slug, locale);
  
  const parentCategory = currentCategory?.parent_id ? categories?.find(c => c.id === currentCategory.parent_id) : null;
  const childCategories = categories?.filter(c => c.parent_id === currentCategory?.id) || [];

  const { data, isLoading, isError } = useProducts({
    category: slug,
    sort,
    min_price: preset.min,
    max_price: preset.max,
    on_sale: onSale,
    page,
    limit: LIMIT,
  });

  function pushParams(mut: (sp: URLSearchParams) => void) {
    const sp = new URLSearchParams(searchParams.toString());
    mut(sp);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const onSort = (v: SortValue) =>
    pushParams((sp) => {
      if (v === "newest") sp.delete("urut");
      else sp.set("urut", v);
      sp.delete("hal");
    });

  const onPrice = (key: string) =>
    pushParams((sp) => {
      if (key === "all") sp.delete("harga");
      else sp.set("harga", key);
      sp.delete("hal");
    });

  const onSaleChange = (sale: boolean) =>
    pushParams((sp) => {
      if (sale) sp.set("sale", "1");
      else sp.delete("sale");
      sp.delete("hal");
    });

  const onPage = (p: number) =>
    pushParams((sp) => {
      if (p <= 1) sp.delete("hal");
      else sp.set("hal", String(p));
    });

  const resetFilters = () =>
    pushParams((sp) => {
      sp.delete("harga");
      sp.delete("urut");
      sp.delete("hal");
      sp.delete("sale");
    });

  const products = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = data ? Math.ceil(total / data.meta.limit) : 1;
  const filtered = priceKey !== "all" || onSale;

  const breadcrumbs = [{ label: t("nav.home"), href: "/" }];
  if (parentCategory) {
    breadcrumbs.push({ label: parentCategory.name, href: `/categories/${parentCategory.slug}` });
  }
  breadcrumbs.push({ label: name, href: "" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Breadcrumbs items={breadcrumbs} />

      <header className="mt-4 flex flex-col md:flex-row gap-6 md:items-start">
        <div className="flex-1">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">{name}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {isLoading ? t("category.loading") : t("category.count", { count: total })}
          </p>
          {currentCategory?.description && (
            <p className="mt-4 text-neutral-600 max-w-2xl">{currentCategory.description}</p>
          )}
          
          {childCategories.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {childCategories.map(child => (
                <Link
                  key={child.id}
                  href={`/categories/${child.slug}`}
                  className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50 transition-colors"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          )}
        </div>
        
        {currentCategory?.image_url && (
          <div className="shrink-0">
            <img 
              src={currentCategory.image_url} 
              alt={name}
              className="h-32 w-48 object-cover rounded-xl border border-neutral-200 shadow-sm"
            />
          </div>
        )}
      </header>

      <div className="mt-6">
        <FilterBar 
          sort={sort} 
          priceKey={priceKey} 
          onSale={onSale} 
          onSort={onSort} 
          onPrice={onPrice} 
          onSaleChange={onSaleChange} 
        />
      </div>

      <div className="mt-8">
        {isLoading ? (
          <ProductGridSkeleton count={LIMIT} />
        ) : isError ? (
          <EmptyState
            title={t("category.error.title")}
            hint={t("category.error.hint")}
          />
        ) : products.length > 0 ? (
          <>
            <ProductGrid products={products} />
            <div className="mt-12">
              <Pagination page={page} totalPages={totalPages} onPage={onPage} />
            </div>
          </>
        ) : filtered ? (
          <EmptyState
            title={t("category.emptyPrice.title")}
            hint={t("category.emptyPrice.hint")}
            action={
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                {t("category.resetFilter")}
              </button>
            }
          />
        ) : (
          <EmptyState
            title={t("category.emptyRoom.title")}
            hint={t("category.emptyRoom.hint")}
          />
        )}
      </div>
    </div>
  );
}
