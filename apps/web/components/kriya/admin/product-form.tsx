"use client";

// Modal form create/edit produk untuk panel admin (M6).
// - Create: kirim field + varian + gambar (upload Storage) sekaligus via createProduct.
// - Edit: field via updateProduct; varian & gambar direkonsiliasi ke endpoint masing-masing.

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Plus, Trash2, Star, Loader2, ImagePlus } from "lucide-react";
import { useCategories, useAdminProduct, useAdminTags, useAdminAttributes, useAdminProducts } from "@/lib/catalog/queries";
import { uploadProductImage } from "@/lib/storage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  createProduct,
  updateProduct,
  createVariant,
  updateVariant,
  deleteVariant,
  addProductImage,
  updateProductImage,
  deleteProductImage,
} from "@/lib/catalog/api";
import { ApiError } from "@/lib/http";
import type { VariantInput } from "@/lib/catalog/types";
import { useLanguage } from "../language-provider";

type VariantRow = {
  key: string;
  id?: string;
  sku: string;
  color: string;
  size: string;
  price: number;
  sale_price?: number;
  sale_starts_at?: string;
  sale_ends_at?: string;
  stock: number;
  is_active?: boolean;
};

type ImageRow = {
  key: string;
  id?: string;
  file?: File;
  previewUrl: string;
  alt: string;
  is_primary: boolean;
  origAlt?: string;
};

const uid = () => crypto.randomUUID();
const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
const isKebab = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);

function emptyVariant(): VariantRow {
  return { key: uid(), sku: "", color: "", size: "", price: 0, stock: 0 };
}

function ProductMultiSelect({
  value,
  onChange,
  excludeId,
  label,
}: {
  value: string[];
  onChange: (val: string[]) => void;
  excludeId?: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { data } = useAdminProducts({ q, limit: 20, status: "published" });

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const remove = (id: string) => {
    onChange(value.filter((v) => v !== id));
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => {
            const prod = data?.data.find((p) => p.id === id);
            return (
              <div key={id} className="flex items-center gap-1 rounded bg-neutral-100 px-2 py-1 text-xs">
                <span className="truncate max-w-[150px]" title={id}>
                  {prod ? prod.name : id}
                </span>
                <button
                  type="button"
                  onClick={() => remove(id)}
                  className="text-neutral-500 hover:text-red-500 ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="flex w-full items-center justify-between rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50">
          Pilih {label}...
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Cari produk..."
              className="w-full rounded bg-neutral-100 px-2 py-1 text-sm outline-none"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
            {data?.data.filter((p) => p.id !== excludeId).map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-neutral-100">
                <input
                  type="checkbox"
                  checked={value.includes(p.id)}
                  onChange={() => toggle(p.id)}
                  className="rounded border-neutral-300 text-brand-strong focus:ring-brand-strong"
                />
                <span className="text-sm truncate">{p.name}</span>
              </label>
            ))}
            {data?.data.length === 0 && (
              <div className="p-2 text-center text-sm text-neutral-500">Tidak ada hasil</div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ProductForm({
  productId,
  onClose,
}: {
  productId?: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const isEdit = Boolean(productId);
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const { data: adminTags } = useAdminTags();
  const { data: adminAttributes } = useAdminAttributes();
  const { data: detail, isLoading: loadingDetail } = useAdminProduct(productId ?? "", isEdit);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [categorySlug, setCategorySlug] = useState("");
  const [description, setDescription] = useState("");
  const [materials, setMaterials] = useState("");
  const [width, setWidth] = useState(0);
  const [depth, setDepth] = useState(0);
  const [height, setHeight] = useState(0);
  const [weight, setWeight] = useState(0);
  const [hasGuide, setHasGuide] = useState(false);
  const [status, setStatus] = useState("published");
  const [featured, setFeatured] = useState(false);
  const [summary, setSummary] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>([]);
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([]);
  const [upsellIds, setUpsellIds] = useState<string[]>([]);
  const [crossSellIds, setCrossSellIds] = useState<string[]>([]);
  
  const [variants, setVariants] = useState<VariantRow[]>([emptyVariant()]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Prefill saat edit. Seeding dilakukan saat render (guarded sekali) mengikuti
  // pola React 19 yang sama dengan /checkout & /profile, bukan di dalam effect —
  // menghindari cascading render. Guard `seeded` juga mencegah refetch
  // (mis. window focus) menimpa suntingan yang belum disimpan.
  const [seeded, setSeeded] = useState(false);
  if (detail && !seeded) {
    setSeeded(true);
    setName(detail.name);
    setSlug(detail.slug);
    setSlugTouched(true);
    setCategorySlug(detail.category_slug);
    setDescription(detail.description ?? "");
    setMaterials((detail.materials ?? []).join(", "));
    setWidth(detail.dimensions?.width_cm ?? 0);
    setDepth(detail.dimensions?.depth_cm ?? 0);
    setHeight(detail.dimensions?.height_cm ?? 0);
      setWeight(detail.weight_kg ?? 0);
      setHasGuide(detail.has_assembly_guide);
      setStatus(detail.status ?? "published");
      setFeatured(detail.featured ?? false);
      setSummary(detail.summary ?? "");
      setSeoTitle(detail.seo_metadata?.en ?? "");
      setSelectedTagSlugs(detail.tag_slugs ?? []);
      setSelectedTermIds(detail.attribute_term_ids ?? []);
      setUpsellIds(detail.upsell_ids ?? []);
      setCrossSellIds(detail.cross_sell_ids ?? []);
      setVariants(
        detail.variants.map((v) => ({
          key: uid(),
          id: v.id,
          sku: v.sku,
          color: v.color ?? "",
          size: v.size ?? "",
          price: v.price,
          sale_price: v.sale_price,
          sale_starts_at: v.sale_starts_at ? new Date(v.sale_starts_at).toISOString().slice(0, 16) : undefined,
          sale_ends_at: v.sale_ends_at ? new Date(v.sale_ends_at).toISOString().slice(0, 16) : undefined,
          stock: v.stock,
          is_active: v.is_active,
        })),
      );
    setImages(
      detail.images.map((img) => ({
        key: uid(),
        id: img.id,
        previewUrl: img.url,
        alt: img.alt ?? "",
        is_primary: img.is_primary,
        origAlt: img.alt ?? "",
      })),
    );
  }

  const effectiveSlug = slugTouched ? slug : slugify(name);

  function setPrimary(key: string) {
    setImages((rows) => rows.map((r) => ({ ...r, is_primary: r.key === key })));
  }

  function onPickFiles(files: FileList | null) {
    if (!files) return;
    const next: ImageRow[] = Array.from(files).map((file) => ({
      key: uid(),
      file,
      previewUrl: URL.createObjectURL(file),
      alt: "",
      is_primary: false,
    }));
    setImages((rows) => {
      const merged = [...rows, ...next];
      if (!merged.some((r) => r.is_primary) && merged.length > 0) merged[0].is_primary = true;
      return merged;
    });
  }

  function removeImage(key: string) {
    setImages((rows) => {
      const target = rows.find((r) => r.key === key);
      if (target?.id) setRemovedImageIds((ids) => [...ids, target.id!]);
      const remaining = rows.filter((r) => r.key !== key);
      if (remaining.length > 0 && !remaining.some((r) => r.is_primary)) {
        remaining[0].is_primary = true;
      }
      return remaining;
    });
  }

  const materialsArr = useMemo(
    () => materials.split(",").map((m) => m.trim()).filter(Boolean),
    [materials],
  );

  function validate(): string | null {
    if (!name.trim()) return "Nama produk wajib diisi.";
    if (!effectiveSlug || !isKebab(effectiveSlug)) return "Slug harus kebab-case (mis. taru-work-desk).";
    if (!categorySlug) return "Kategori wajib dipilih.";
    if (variants.length === 0) return "Minimal satu varian.";
    for (const v of variants) {
      if (!v.sku.trim()) return "SKU varian wajib diisi.";
      if (v.price < 1) return "Harga varian harus lebih dari 0.";
      if (v.stock < 0) return "Stok tidak boleh negatif.";
    }
    return null;
  }

  function toVariantInput(v: VariantRow): VariantInput {
    return {
      sku: v.sku.trim(),
      color: v.color.trim(),
      size: v.size.trim() ? v.size.trim() : null,
      price: v.price,
      sale_price: v.sale_price || null,
      sale_starts_at: v.sale_starts_at || null,
      sale_ends_at: v.sale_ends_at || null,
      stock: v.stock,
      is_active: v.is_active ?? true,
    };
  }

  async function handleSubmit() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const baseFields = {
        slug: effectiveSlug,
        name: name.trim(),
        category_slug: categorySlug,
        description: description.trim(),
        materials: materialsArr,
        dimensions: { width_cm: width, depth_cm: depth, height_cm: height },
        weight_kg: weight,
        has_assembly_guide: hasGuide,
        status: status,
        featured: featured,
        summary: summary.trim(),
        seo_metadata: seoTitle ? { en: seoTitle, id: seoTitle } : undefined,
        tag_slugs: selectedTagSlugs,
        attribute_term_ids: selectedTermIds,
        upsell_ids: upsellIds,
        cross_sell_ids: crossSellIds,
      };

      if (!isEdit) {
        // Upload gambar baru → storage_path, lalu buat produk lengkap.
        const uploaded = await Promise.all(
          images.map(async (r) => ({
            storage_path: await uploadProductImage(r.file!, effectiveSlug),
            alt: r.alt,
            is_primary: r.is_primary,
          })),
        );
        await createProduct({
          ...baseFields,
          variants: variants.map(toVariantInput),
          images: uploaded,
        });
      } else {
        const pid = productId!;
        await updateProduct(pid, baseFields);

        // Varian: hapus yang dihilangkan, update yang ada, buat yang baru.
        const origIds = new Set((detail?.variants ?? []).map((v) => v.id));
        const currentIds = new Set(variants.filter((v) => v.id).map((v) => v.id!));
        for (const id of origIds) {
          if (!currentIds.has(id)) await deleteVariant(pid, id);
        }
        for (const v of variants) {
          if (v.id) await updateVariant(pid, v.id, toVariantInput(v));
          else await createVariant(pid, toVariantInput(v));
        }

        // Gambar: hapus, upload+tambah yang baru, lalu rekonsiliasi alt/primary.
        // Id gambar baru dikumpulkan ke array lokal `persisted` — objek di state
        // `images` tidak dimutasi (react-hooks/immutability).
        for (const id of removedImageIds) await deleteProductImage(pid, id);
        const persisted: { id: string; alt: string; is_primary: boolean }[] = [];
        for (const r of images) {
          if (r.id) {
            persisted.push({ id: r.id, alt: r.alt, is_primary: r.is_primary });
          } else if (r.file) {
            const storage_path = await uploadProductImage(r.file, effectiveSlug);
            const created = await addProductImage(pid, { storage_path, alt: r.alt, is_primary: false });
            persisted.push({ id: created.id, alt: r.alt, is_primary: r.is_primary });
          }
        }
        const primary = persisted.find((r) => r.is_primary) ?? persisted[0];
        for (const r of persisted) {
          if (r !== primary) await updateProductImage(pid, r.id, { alt: r.alt, is_primary: false });
        }
        if (primary) await updateProductImage(pid, primary.id, { alt: primary.alt, is_primary: true });
      }

      toast.success(isEdit ? "Produk diperbarui" : "Produk dibuat");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      if (isEdit) qc.invalidateQueries({ queryKey: ["admin-product", productId] });
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal menyimpan produk");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            {isEdit ? "Edit Produk" : "Tambah Produk"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isEdit && loadingDetail ? (
          <div className="flex items-center justify-center gap-2 py-24 text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Memuat produk…
          </div>
        ) : (
          <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
            {/* Field produk */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nama produk">
                  <input
                    className={inputCls}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="TARU work desk"
                  />
                </Field>
                <Field label="Slug">
                  <input
                    className={inputCls}
                    value={effectiveSlug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setSlugTouched(true);
                    }}
                    placeholder="taru-work-desk"
                  />
                </Field>
                <Field label="Kategori">
                  <select className={inputCls} value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}>
                    <option value="">Pilih kategori...</option>
                    {categories?.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Berat (kg)">
                  <input
                    type="number"
                    step="0.1"
                    className={inputCls}
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                  />
                </Field>
                <Field label="Status">
                  <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </Field>
                <Field label="Pilihan (Featured)">
                  <select className={inputCls} value={featured ? "true" : "false"} onChange={(e) => setFeatured(e.target.value === "true")}>
                    <option value="false">Tidak</option>
                    <option value="true">Ya</option>
                  </select>
                </Field>
                <Field label="SEO Title">
                  <input
                    className={inputCls}
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="Title for SEO"
                  />
                </Field>
              </div>

              <Field label="Ringkasan Pendek (Summary)">
                <input
                  className={inputCls}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Deskripsi singkat untuk kartu produk"
                />
              </Field>

              <Field label="Tags">
                <div className="flex flex-wrap gap-3">
                  {adminTags?.map(tag => (
                    <label key={tag.id} className="flex items-center gap-1.5 text-sm">
                      <input 
                        type="checkbox"
                        checked={selectedTagSlugs.includes(tag.slug)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedTagSlugs([...selectedTagSlugs, tag.slug]);
                          else setSelectedTagSlugs(selectedTagSlugs.filter(s => s !== tag.slug));
                        }}
                      />
                      {tag.name_i18n?.id || tag.slug}
                    </label>
                  ))}
                </div>
              </Field>

              {adminAttributes?.map(attr => (
                <Field key={attr.id} label={`Atribut: ${attr.name_i18n?.id || attr.slug}`}>
                  <div className="flex flex-wrap gap-3">
                    {attr.terms.map(term => (
                      <label key={term.id} className="flex items-center gap-1.5 text-sm">
                        <input 
                          type="checkbox"
                          checked={selectedTermIds.includes(term.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedTermIds([...selectedTermIds, term.id]);
                            else setSelectedTermIds(selectedTermIds.filter(id => id !== term.id));
                          }}
                        />
                        {term.name_i18n?.id || term.slug}
                      </label>
                    ))}
                  </div>
                </Field>
              ))}

              <div className="grid grid-cols-2 gap-4">
                <Field label={t("adminCatalog.productForm.upsell")}>
                  <ProductMultiSelect
                    label="Upsell"
                    value={upsellIds}
                    onChange={setUpsellIds}
                    excludeId={productId}
                  />
                </Field>
                <Field label={t("adminCatalog.productForm.crossSell")}>
                  <ProductMultiSelect
                    label="Cross-sell"
                    value={crossSellIds}
                    onChange={setCrossSellIds}
                    excludeId={productId}
                  />
                </Field>
              </div>

            <Field label="Deskripsi">
              <textarea
                className={`${inputCls} min-h-20`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <Field label="Material (pisahkan dengan koma)">
              <input
                className={inputCls}
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                placeholder="kayu jati, baja"
              />
            </Field>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Lebar (cm)">
                <input type="number" className={inputCls} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
              </Field>
              <Field label="Kedalaman (cm)">
                <input type="number" className={inputCls} value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
              </Field>
              <Field label="Tinggi (cm)">
                <input type="number" className={inputCls} value={height} onChange={(e) => setHeight(Number(e.target.value))} />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={hasGuide} onChange={(e) => setHasGuide(e.target.checked)} />
              Punya panduan perakitan
            </label>

            {/* Varian */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900">Varian</h3>
                <button
                  onClick={() => setVariants((v) => [...v, emptyVariant()])}
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong"
                >
                  <Plus className="h-4 w-4" /> Tambah varian
                </button>
              </div>
              <div className="space-y-2">
                    {variants.map((v) => (
                      <div key={v.key} className="rounded-lg border border-neutral-200 p-3 space-y-2">
                        <div className="grid grid-cols-12 items-center gap-2">
                          <input
                            className={`${inputCls} col-span-2`}
                            placeholder="SKU"
                            value={v.sku}
                            onChange={(e) => setVariants((rows) => rows.map((r) => (r.key === v.key ? { ...r, sku: e.target.value } : r)))}
                          />
                          <input
                            className={`${inputCls} col-span-2`}
                            placeholder="Warna"
                            value={v.color}
                            onChange={(e) => setVariants((rows) => rows.map((r) => (r.key === v.key ? { ...r, color: e.target.value } : r)))}
                          />
                          <input
                            className={`${inputCls} col-span-2`}
                            placeholder="Ukuran"
                            value={v.size}
                            onChange={(e) => setVariants((rows) => rows.map((r) => (r.key === v.key ? { ...r, size: e.target.value } : r)))}
                          />
                          <input
                            type="number"
                            className={`${inputCls} col-span-2`}
                            placeholder="Harga"
                            value={v.price || ""}
                            onChange={(e) => setVariants((rows) => rows.map((r) => (r.key === v.key ? { ...r, price: Number(e.target.value) } : r)))}
                          />
                          <input
                            type="number"
                            className={`${inputCls} col-span-2`}
                            placeholder="Stok"
                            value={v.stock || ""}
                            onChange={(e) => setVariants((rows) => rows.map((r) => (r.key === v.key ? { ...r, stock: Number(e.target.value) } : r)))}
                          />
                          <label className="col-span-1 flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={v.is_active ?? true}
                              onChange={(e) => setVariants((rows) => rows.map((r) => (r.key === v.key ? { ...r, is_active: e.target.checked } : r)))}
                              title="Aktif?"
                            />
                          </label>
                          <button
                            onClick={() => setVariants((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== v.key) : rows))}
                            disabled={variants.length <= 1}
                            title={variants.length <= 1 ? "Minimal satu varian" : "Hapus varian"}
                            className="col-span-1 flex justify-center text-neutral-400 hover:text-red-600 disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-12 items-center gap-2 border-t border-neutral-100 pt-2">
                          <input
                            type="number"
                            className={`${inputCls} col-span-4`}
                            placeholder="Harga Sale (Opsional)"
                            value={v.sale_price || ""}
                            onChange={(e) => setVariants((rows) => rows.map((r) => (r.key === v.key ? { ...r, sale_price: e.target.value ? Number(e.target.value) : undefined } : r)))}
                          />
                          <input
                            type="datetime-local"
                            className={`${inputCls} col-span-4`}
                            placeholder="Mulai Sale"
                            value={v.sale_starts_at || ""}
                            onChange={(e) => setVariants((rows) => rows.map((r) => (r.key === v.key ? { ...r, sale_starts_at: e.target.value } : r)))}
                          />
                          <input
                            type="datetime-local"
                            className={`${inputCls} col-span-4`}
                            placeholder="Akhir Sale"
                            value={v.sale_ends_at || ""}
                            onChange={(e) => setVariants((rows) => rows.map((r) => (r.key === v.key ? { ...r, sale_ends_at: e.target.value } : r)))}
                          />
                        </div>
                      </div>
                    ))}
              </div>
            </div>

            {/* Gambar */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900">Gambar</h3>
                <label className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong">
                  <ImagePlus className="h-4 w-4" /> Unggah gambar
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => onPickFiles(e.target.files)}
                  />
                </label>
              </div>
              {images.length === 0 ? (
                <p className="rounded-lg border border-dashed border-neutral-300 py-6 text-center text-sm text-neutral-400">
                  Belum ada gambar. Produk akan memakai placeholder.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {images.map((img) => (
                    <div key={img.key} className="group relative overflow-hidden rounded-lg border border-neutral-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.previewUrl} alt={img.alt} className="aspect-square w-full object-cover" />
                      <div className="absolute inset-x-0 top-0 flex justify-between p-1">
                        <button
                          onClick={() => setPrimary(img.key)}
                          title="Jadikan gambar utama"
                          className={`rounded-md p-1 ${img.is_primary ? "bg-amber-400 text-white" : "bg-white/80 text-neutral-500 hover:text-amber-500"}`}
                        >
                          <Star className="h-3.5 w-3.5" fill={img.is_primary ? "currentColor" : "none"} />
                        </button>
                        <button
                          onClick={() => removeImage(img.key)}
                          title="Hapus gambar"
                          className="rounded-md bg-white/80 p-1 text-neutral-500 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {img.is_primary && (
                        <span className="absolute bottom-1 left-1 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          Utama
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-neutral-200 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-strong px-4 py-2 text-sm font-medium text-white hover:bg-brand disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Simpan perubahan" : "Simpan produk"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  );
}
