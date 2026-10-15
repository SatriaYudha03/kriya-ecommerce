"use client";

// Editor produk halaman penuh (ala "Tambahkan produk" Shopify): kolom utama
// berisi judul/deskripsi, media, varian, pengiriman, SEO; kolom samping berisi
// status, organisasi, dan produk terkait.
// - Create: kirim field + varian + gambar (upload Storage) sekaligus via createProduct.
// - Edit: field via updateProduct; varian & gambar direkonsiliasi ke endpoint masing-masing.

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, ImagePlus, Plus, Star, Tag, Trash2, X } from "lucide-react";
import {
  useCategories,
  useAdminProduct,
  useAdminTags,
  useAdminAttributes,
  useAdminProducts,
  useDeleteProduct,
  catalogKeys,
} from "@/lib/catalog/queries";
import { promoKeys } from "@/lib/promo/queries";
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
import { useLanguage } from "@/components/kriya/language-provider";
import { ProductStatusBadge } from "./status-badges";
import {
  Button,
  ButtonLink,
  Card,
  CardSection,
  Checkbox,
  ChoiceChip,
  ConfirmModal,
  Field,
  FormGrid,
  Layout,
  LayoutAside,
  LayoutMain,
  LoadingState,
  Page,
  PageHeader,
  SelectInput,
  TextArea,
  TextInput,
  Toggle,
  ToggleRow,
  buttonClass,
} from "./ui";

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
  showSale?: boolean;
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
  return { key: uid(), sku: "", color: "", size: "", price: 0, stock: 0, is_active: true };
}

export function ProductMultiSelect({
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
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { data } = useAdminProducts({ q, limit: 20, status: "published" });

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className={buttonClass("secondary", "slim", "w-full justify-start font-medium")}>
          <Plus /> {t("adminCatalog.productForm.selectLabel", { label })}
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="border-b p-2">
            <TextInput
              placeholder={t("adminCatalog.productForm.searchProduct")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1.5">
            {data?.data
              .filter((p) => p.id !== excludeId)
              .map((p) => (
                <Checkbox
                  key={p.id}
                  className="rounded-md px-1.5 py-1 hover:bg-admin-hover"
                  checked={value.includes(p.id)}
                  onChange={() => toggle(p.id)}
                  label={<span className="line-clamp-1">{p.name}</span>}
                />
              ))}
            {data?.data.length === 0 && (
              <p className="p-3 text-center text-[13px] text-admin-muted">{t("adminCatalog.productForm.noResult")}</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const prod = data?.data.find((p) => p.id === id);
            return (
              <span
                key={id}
                className="inline-flex h-6 max-w-full items-center gap-1 rounded-lg bg-admin-hover pl-2 pr-1 text-xs font-medium text-admin-text"
              >
                <span className="truncate" title={id}>
                  {prod ? prod.name : id.slice(0, 8)}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v !== id))}
                  aria-label={t("admin.common.remove")}
                  className="rounded p-0.5 text-admin-muted hover:bg-black/10 hover:text-admin-text"
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ProductEditor({ productId }: { productId?: string }) {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const isEdit = Boolean(productId);
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const { data: adminTags } = useAdminTags();
  const { data: adminAttributes } = useAdminAttributes();
  const { data: detail, isLoading: loadingDetail, isError: detailError } = useAdminProduct(productId ?? "", isEdit);
  const del = useDeleteProduct();
  const [confirmDelete, setConfirmDelete] = useState(false);

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
        showSale: Boolean(v.sale_price),
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
    setRemovedImageIds([]);
  }

  const effectiveSlug = slugTouched ? slug : slugify(name);

  const patchVariant = (key: string, p: Partial<VariantRow>) =>
    setVariants((rows) => rows.map((r) => (r.key === key ? { ...r, ...p } : r)));

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
      if (!merged.some((r) => r.is_primary) && merged.length > 0) merged[0] = { ...merged[0], is_primary: true };
      return merged;
    });
  }

  function removeImage(key: string) {
    setImages((rows) => {
      const target = rows.find((r) => r.key === key);
      if (target?.id) setRemovedImageIds((ids) => [...ids, target.id!]);
      const remaining = rows.filter((r) => r.key !== key);
      if (remaining.length > 0 && !remaining.some((r) => r.is_primary)) {
        remaining[0] = { ...remaining[0], is_primary: true };
      }
      return remaining;
    });
  }

  const materialsArr = useMemo(
    () => materials.split(",").map((m) => m.trim()).filter(Boolean),
    [materials],
  );

  function validate(): string | null {
    if (!name.trim()) return t("adminCatalog.productForm.nameRequired");
    if (!effectiveSlug || !isKebab(effectiveSlug)) return t("adminCatalog.productForm.slugInvalid");
    if (!categorySlug) return t("adminCatalog.productForm.categoryRequired");
    if (variants.length === 0) return t("adminCatalog.productForm.minVariant");
    for (const v of variants) {
      if (!v.sku.trim()) return t("adminCatalog.productForm.skuRequired");
      if (v.price < 1) return t("adminCatalog.productForm.pricePositive");
      if (v.stock < 0) return t("adminCatalog.productForm.stockNonNeg");
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
        const created = await createProduct({
          ...baseFields,
          variants: variants.map(toVariantInput),
          images: uploaded,
        });
        toast.success(t("adminCatalog.productForm.created"));
        qc.invalidateQueries({ queryKey: catalogKeys.all });
        qc.invalidateQueries({ queryKey: promoKeys.stats() });
        router.replace(`/admin/products/${created.id}`);
        return;
      }

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

      toast.success(t("adminCatalog.productForm.updated"));
      qc.invalidateQueries({ queryKey: promoKeys.stats() });
      // Tunggu detail termuat ulang lalu seed ulang form, supaya varian & gambar
      // baru memegang id dari server (simpan berikutnya tidak menggandakan).
      await qc.invalidateQueries({ queryKey: catalogKeys.all });
      setSeeded(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : e instanceof Error ? e.message : t("adminCatalog.productForm.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const tagLabel = (i18n: Record<string, string> | undefined, fallback: string) =>
    i18n?.[locale] || i18n?.id || fallback;

  if (isEdit && loadingDetail) {
    return (
      <Page>
        <LoadingState label={t("adminCatalog.productForm.loadingProduct")} />
      </Page>
    );
  }

  if (isEdit && (detailError || !detail)) {
    return (
      <Page>
        <PageHeader icon={Tag} backHref="/admin/products" backLabel={t("adminCatalog.products.title")} title={t("admin.products.notFound")} />
      </Page>
    );
  }

  const actions = (
    <>
      {isEdit && detail && (
        <ButtonLink href={`/products/${detail.slug}`} target="_blank" variant="secondary">
          <ExternalLink /> {t("admin.products.viewInStore")}
        </ButtonLink>
      )}
      <Button variant="primary" loading={saving} onClick={handleSubmit}>
        {isEdit ? t("adminCatalog.productForm.saveEdit") : t("adminCatalog.productForm.saveNew")}
      </Button>
    </>
  );

  return (
    <Page>
      <PageHeader
        icon={Tag}
        backHref="/admin/products"
        backLabel={t("adminCatalog.products.title")}
        title={isEdit ? name || detail?.name : t("adminCatalog.productForm.addTitle")}
        badge={isEdit ? <ProductStatusBadge status={status} /> : undefined}
        actions={actions}
      />

      <Layout>
        <LayoutMain>
          <Card>
            <div className="space-y-4">
              <Field label={t("admin.products.titleLabel")} htmlFor="p-name">
                <TextInput id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="TARU work desk" />
              </Field>
              <Field label={t("adminCatalog.productForm.descLabel")} htmlFor="p-desc">
                <TextArea id="p-desc" rows={7} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
              <Field
                label={t("admin.products.summaryLabel")}
                htmlFor="p-summary"
                help={t("adminCatalog.productForm.summaryPlaceholder")}
              >
                <TextInput id="p-summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card title={t("admin.products.media")}>
            {images.length === 0 ? (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#b5b5b5] px-4 py-10 text-center transition-colors hover:bg-admin-subdued">
                <span className={buttonClass("secondary", "medium")}>
                  <ImagePlus /> {t("admin.products.uploadNew")}
                </span>
                <span className="text-[13px] text-admin-muted">{t("admin.products.mediaHint")}</span>
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onPickFiles(e.target.files)} />
              </label>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((img) => (
                  <div
                    key={img.key}
                    className="group relative overflow-hidden rounded-xl border border-admin-border bg-admin-subdued"
                  >
                    <div className="relative aspect-square w-full">
                      <Image src={img.previewUrl} alt={img.alt} fill unoptimized sizes="160px" className="object-cover" />
                    </div>
                    <div className="absolute inset-x-0 top-0 flex justify-between p-1.5">
                      <button
                        type="button"
                        onClick={() => setPrimary(img.key)}
                        title={t("adminCatalog.productForm.setPrimary")}
                        aria-label={t("adminCatalog.productForm.setPrimary")}
                        className={`rounded-md p-1 shadow-sm ${img.is_primary ? "bg-[#303030] text-white" : "bg-white/90 text-admin-muted hover:text-admin-text"}`}
                      >
                        <Star className="size-3.5" fill={img.is_primary ? "currentColor" : "none"} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(img.key)}
                        title={t("adminCatalog.productForm.removeImage")}
                        aria-label={t("adminCatalog.productForm.removeImage")}
                        className="rounded-md bg-white/90 p-1 text-admin-muted shadow-sm hover:text-admin-critical"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    {img.is_primary && (
                      <span className="absolute bottom-1.5 left-1.5 rounded-md bg-[#303030] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {t("adminCatalog.productForm.primaryBadge")}
                      </span>
                    )}
                  </div>
                ))}
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#b5b5b5] text-admin-muted transition-colors hover:bg-admin-subdued hover:text-admin-text">
                  <Plus className="size-5" />
                  <span className="text-xs font-medium">{t("adminCatalog.productForm.uploadImage")}</span>
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onPickFiles(e.target.files)} />
                </label>
              </div>
            )}
          </Card>

          <Card
            flush
            title={t("adminCatalog.productForm.variantsTitle")}
            description={t("admin.products.variantsHint")}
            action={
              <Button size="slim" variant="tertiary" onClick={() => setVariants((v) => [...v, emptyVariant()])}>
                <Plus /> {t("adminCatalog.productForm.addVariant")}
              </Button>
            }
          >
            {variants.map((v, i) => (
              <div key={v.key} className="border-t border-admin-border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[13px] font-semibold text-admin-text">
                    {[v.color, v.size].filter(Boolean).join(" / ") || t("admin.products.variantN", { n: i + 1 })}
                  </p>
                  <div className="flex items-center gap-1">
                    <ToggleRowInline
                      label={t("admin.products.variantActive")}
                      checked={v.is_active ?? true}
                      onChange={(next) => patchVariant(v.key, { is_active: next })}
                    />
                    <Button
                      variant="tertiary"
                      size="icon-slim"
                      onClick={() => setVariants((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== v.key) : rows))}
                      disabled={variants.length <= 1}
                      title={
                        variants.length <= 1
                          ? t("adminCatalog.productForm.minOneVariant")
                          : t("adminCatalog.productForm.removeVariant")
                      }
                      aria-label={t("adminCatalog.productForm.removeVariant")}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <FormGrid cols={3}>
                  <Field label={t("adminCatalog.productForm.skuLabel")}>
                    <TextInput value={v.sku} onChange={(e) => patchVariant(v.key, { sku: e.target.value })} />
                  </Field>
                  <Field label={t("adminCatalog.productForm.colorLabel")}>
                    <TextInput value={v.color} onChange={(e) => patchVariant(v.key, { color: e.target.value })} />
                  </Field>
                  <Field label={t("adminCatalog.productForm.sizeLabel")}>
                    <TextInput value={v.size} onChange={(e) => patchVariant(v.key, { size: e.target.value })} />
                  </Field>
                  <Field label={t("adminCatalog.productForm.priceLabel")}>
                    <TextInput
                      type="number"
                      min={0}
                      prefix="Rp"
                      placeholder="0"
                      value={v.price || ""}
                      onChange={(e) => patchVariant(v.key, { price: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label={t("adminCatalog.productForm.stockLabel")}>
                    <TextInput
                      type="number"
                      min={0}
                      placeholder="0"
                      value={v.stock || ""}
                      onChange={(e) => patchVariant(v.key, { stock: Number(e.target.value) })}
                    />
                  </Field>
                </FormGrid>
                {v.showSale ? (
                  <div className="mt-4 rounded-xl bg-admin-subdued p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold text-admin-text">{t("admin.products.sale")}</p>
                      <Button
                        size="slim"
                        variant="tertiary"
                        onClick={() =>
                          patchVariant(v.key, {
                            showSale: false,
                            sale_price: undefined,
                            sale_starts_at: undefined,
                            sale_ends_at: undefined,
                          })
                        }
                      >
                        {t("admin.common.remove")}
                      </Button>
                    </div>
                    <FormGrid cols={3}>
                      <Field label={t("admin.products.salePrice")}>
                        <TextInput
                          type="number"
                          min={0}
                          prefix="Rp"
                          value={v.sale_price || ""}
                          onChange={(e) =>
                            patchVariant(v.key, { sale_price: e.target.value ? Number(e.target.value) : undefined })
                          }
                        />
                      </Field>
                      <Field label={t("adminCatalog.productForm.saleStartLabel")}>
                        <TextInput
                          type="datetime-local"
                          value={v.sale_starts_at || ""}
                          onChange={(e) => patchVariant(v.key, { sale_starts_at: e.target.value })}
                        />
                      </Field>
                      <Field label={t("adminCatalog.productForm.saleEndLabel")}>
                        <TextInput
                          type="datetime-local"
                          value={v.sale_ends_at || ""}
                          onChange={(e) => patchVariant(v.key, { sale_ends_at: e.target.value })}
                        />
                      </Field>
                    </FormGrid>
                  </div>
                ) : (
                  <div className="mt-3">
                    <ChoiceChip selected={false} onClick={() => patchVariant(v.key, { showSale: true })}>
                      <Plus className="size-3.5" /> {t("admin.products.addSale")}
                    </ChoiceChip>
                  </div>
                )}
              </div>
            ))}
          </Card>

          <Card title={t("admin.products.shipping")}>
            <div className="space-y-4">
              <Field label={t("admin.products.dimensions")} help={t("admin.products.dimensionsHint")}>
                <div className="flex items-center gap-2">
                  <TextInput
                    type="number"
                    min={0}
                    prefix={t("admin.products.dimW")}
                    suffix="cm"
                    aria-label={t("adminCatalog.productForm.widthLabel")}
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                  />
                  <span className="text-admin-muted">×</span>
                  <TextInput
                    type="number"
                    min={0}
                    prefix={t("admin.products.dimD")}
                    suffix="cm"
                    aria-label={t("adminCatalog.productForm.depthLabel")}
                    value={depth}
                    onChange={(e) => setDepth(Number(e.target.value))}
                  />
                  <span className="text-admin-muted">×</span>
                  <TextInput
                    type="number"
                    min={0}
                    prefix={t("admin.products.dimH")}
                    suffix="cm"
                    aria-label={t("adminCatalog.productForm.heightLabel")}
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                  />
                </div>
              </Field>
              <FormGrid>
                <Field label={t("admin.products.weight")} htmlFor="p-weight">
                  <TextInput
                    id="p-weight"
                    type="number"
                    step="0.1"
                    min={0}
                    suffix="kg"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                  />
                </Field>
                <Field label={t("admin.products.materials")} htmlFor="p-materials" help={t("admin.products.materialsHint")}>
                  <TextInput
                    id="p-materials"
                    value={materials}
                    onChange={(e) => setMaterials(e.target.value)}
                    placeholder={t("adminCatalog.productForm.materialPlaceholder")}
                  />
                </Field>
              </FormGrid>
              <Checkbox
                label={t("adminCatalog.productForm.hasGuide")}
                checked={hasGuide}
                onChange={(e) => setHasGuide(e.target.checked)}
              />
            </div>
          </Card>

          <Card title={t("admin.products.seo")} description={t("admin.products.seoHint")}>
            <div className="space-y-4">
              <Field label={t("admin.products.seoTitle")} htmlFor="p-seo">
                <TextInput id="p-seo" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={name} />
              </Field>
              <Field label={t("admin.products.handle")} htmlFor="p-slug" help={t("admin.products.handleHint")}>
                <TextInput
                  id="p-slug"
                  prefix="/products/"
                  value={effectiveSlug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugTouched(true);
                  }}
                  placeholder="taru-work-desk"
                />
              </Field>
            </div>
          </Card>
        </LayoutMain>

        <LayoutAside>
          <Card title={t("adminCatalog.productForm.statusLabel")}>
            <div className="space-y-4">
              <SelectInput
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label={t("adminCatalog.productForm.statusLabel")}
              >
                <option value="published">{t("adminCatalog.products.published")}</option>
                <option value="draft">{t("adminCatalog.products.draft")}</option>
                <option value="archived">{t("adminCatalog.products.archived")}</option>
              </SelectInput>
              <ToggleRow
                label={t("admin.products.featured")}
                help={t("admin.products.featuredHint")}
                checked={featured}
                onChange={setFeatured}
              />
            </div>
          </Card>

          <Card title={t("admin.products.organization")}>
            <div className="space-y-4">
              <Field label={t("adminCatalog.productForm.categoryLabel")} htmlFor="p-category">
                <SelectInput id="p-category" value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}>
                  <option value="">{t("adminCatalog.productForm.categoryPlaceholder")}</option>
                  {categories?.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label={t("admin.products.tags")}>
                {adminTags && adminTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {adminTags.map((tag) => {
                      const on = selectedTagSlugs.includes(tag.slug);
                      return (
                        <ChoiceChip
                          key={tag.id}
                          selected={on}
                          onClick={() =>
                            setSelectedTagSlugs(on ? selectedTagSlugs.filter((s) => s !== tag.slug) : [...selectedTagSlugs, tag.slug])
                          }
                        >
                          {tagLabel(tag.name_i18n, tag.slug)}
                        </ChoiceChip>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[13px] text-admin-muted">{t("adminCatalog.tags.empty")}</p>
                )}
              </Field>
            </div>
          </Card>

          {adminAttributes && adminAttributes.length > 0 && (
            <Card flush title={t("admin.products.attributes")}>
              {adminAttributes.map((attr) => (
                <CardSection key={attr.id} title={tagLabel(attr.name_i18n, attr.slug)}>
                  <div className="flex flex-wrap gap-1.5">
                    {attr.terms.map((term) => {
                      const on = selectedTermIds.includes(term.id);
                      return (
                        <ChoiceChip
                          key={term.id}
                          selected={on}
                          onClick={() =>
                            setSelectedTermIds(on ? selectedTermIds.filter((id) => id !== term.id) : [...selectedTermIds, term.id])
                          }
                        >
                          {tagLabel(term.name_i18n, term.slug)}
                        </ChoiceChip>
                      );
                    })}
                  </div>
                </CardSection>
              ))}
            </Card>
          )}

          <Card title={t("admin.products.related")}>
            <div className="space-y-4">
              <Field label={t("adminCatalog.productForm.upsell")}>
                <ProductMultiSelect label="upsell" value={upsellIds} onChange={setUpsellIds} excludeId={productId} />
              </Field>
              <Field label={t("adminCatalog.productForm.crossSell")}>
                <ProductMultiSelect label="cross-sell" value={crossSellIds} onChange={setCrossSellIds} excludeId={productId} />
              </Field>
            </div>
          </Card>
        </LayoutAside>
      </Layout>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#d4d4d4] pt-5">
        {isEdit ? (
          <Button variant="critical" onClick={() => setConfirmDelete(true)}>
            {t("admin.products.delete")}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <ButtonLink href="/admin/products">{t("adminCatalog.productForm.cancel")}</ButtonLink>
          <Button variant="primary" loading={saving} onClick={handleSubmit}>
            {isEdit ? t("adminCatalog.productForm.saveEdit") : t("adminCatalog.productForm.saveNew")}
          </Button>
        </div>
      </div>

      {isEdit && productId && (
        <ConfirmModal
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title={t("admin.products.deleteTitle")}
          message={t("adminCatalog.products.deleteConfirm", { name })}
          confirmLabel={t("adminCatalog.products.delete")}
          loading={del.isPending}
          onConfirm={() =>
            del.mutate(productId, {
              onSuccess: () => router.replace("/admin/products"),
            })
          }
        />
      )}
    </Page>
  );
}

function ToggleRowInline({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="mr-1 flex items-center gap-2">
      <span className="text-xs text-admin-muted">{label}</span>
      <Toggle label={label} checked={checked} onChange={onChange} />
    </div>
  );
}
