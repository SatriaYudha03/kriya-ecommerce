"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Image as ImageIcon, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/kriya/language-provider";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  FormGrid,
  LoadingState,
  Page,
  PageHeader,
  TextArea,
  TextInput,
  Toggle,
  buttonClass,
} from "@/components/kriya/admin/ui";
import { useAdminHeroSlides, useSaveHeroSlides } from "@/lib/hero/queries";
import type { HeroSlide, HeroSlideInput } from "@/lib/hero/types";
import { supabase } from "@/lib/supabase";
import { uploadProductImage } from "@/lib/storage";

const MAX_SLIDES = 8;

// key = id klien stabil untuk React (slide baru belum punya id dari server).
type Row = HeroSlideInput & { key: string; image_url: string };

function toRow(s: HeroSlide): Row {
  return { ...s, key: s.id };
}

function emptyRow(): Row {
  return {
    key: crypto.randomUUID(),
    eyebrow_id: "",
    eyebrow_en: "",
    title_id: "",
    title_en: "",
    subtitle_id: "",
    subtitle_en: "",
    href: "/products",
    image_path: "",
    image_url: "",
    alt: "",
    is_active: true,
  };
}

function publicUrl(storagePath: string): string {
  if (storagePath.startsWith("http")) return storagePath;
  const key = storagePath.replace(/^products\//, "");
  return supabase.storage.from("products").getPublicUrl(key).data.publicUrl;
}

type TextField =
  | "eyebrow_id"
  | "eyebrow_en"
  | "title_id"
  | "title_en"
  | "subtitle_id"
  | "subtitle_en"
  | "href"
  | "alt";

function HeroEditor({ initial }: { initial: HeroSlide[] }) {
  const { t } = useLanguage();
  const { mutate: save, isPending } = useSaveHeroSlides();
  const [rows, setRows] = useState<Row[]>(() => initial.map(toRow));
  const [uploading, setUploading] = useState<string | null>(null);

  const patch = (key: string, p: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const setText = (key: string, field: TextField, value: string) => patch(key, { [field]: value });

  const move = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const j = i + d;
      if (j < 0 || j >= rs.length) return rs;
      const next = [...rs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  async function onPick(key: string, file: File | undefined) {
    if (!file) return;
    setUploading(key);
    try {
      const path = await uploadProductImage(file, "hero");
      patch(key, { image_path: path, image_url: publicUrl(path) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(null);
    }
  }

  function onSave() {
    const missing = rows.findIndex((r) => !r.image_path);
    if (missing >= 0) {
      toast.error(t("adminHero.needImage", { n: missing + 1 }));
      return;
    }
    if (!rows.some((r) => r.is_active)) {
      toast.error(t("adminHero.needActive"));
      return;
    }
    const payload: HeroSlideInput[] = rows.map((r) => ({
      eyebrow_id: r.eyebrow_id,
      eyebrow_en: r.eyebrow_en,
      title_id: r.title_id,
      title_en: r.title_en,
      subtitle_id: r.subtitle_id,
      subtitle_en: r.subtitle_en,
      href: r.href,
      image_path: r.image_path,
      alt: r.alt,
      is_active: r.is_active,
    }));
    save(payload, {
      onSuccess: (data) => {
        setRows(data.map(toRow));
        toast.success(t("adminHero.saved"));
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <>
      <div className="space-y-4">
        {rows.map((r, i) => (
          <Card
            key={r.key}
            title={
              <span className="flex items-center gap-2">
                {t("adminHero.slide", { n: i + 1 })}
                {!r.is_active && <Badge>{t("admin.hero.hidden")}</Badge>}
              </span>
            }
            action={
              <div className="flex items-center gap-1">
                <span className="mr-1 hidden text-xs text-admin-muted sm:inline">{t("adminHero.active")}</span>
                <Toggle checked={r.is_active} onChange={(v) => patch(r.key, { is_active: v })} label={t("adminHero.active")} />
                <span className="mx-1 h-5 w-px bg-admin-border" />
                <Button variant="tertiary" size="icon-slim" aria-label={t("adminHero.moveUp")} title={t("adminHero.moveUp")} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp />
                </Button>
                <Button
                  variant="tertiary"
                  size="icon-slim"
                  aria-label={t("adminHero.moveDown")}
                  title={t("adminHero.moveDown")}
                  disabled={i === rows.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  variant="tertiary"
                  size="icon-slim"
                  aria-label={t("adminHero.remove")}
                  title={t("adminHero.remove")}
                  disabled={rows.length === 1}
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                >
                  <Trash2 />
                </Button>
              </div>
            }
          >
            <div className="grid gap-5 md:grid-cols-[260px_1fr]">
              <div className="space-y-2">
                <div className="relative aspect-video overflow-hidden rounded-xl border border-admin-border bg-admin-subdued">
                  {r.image_url ? (
                    <Image src={r.image_url} alt={r.alt} fill sizes="260px" className="object-cover" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-admin-muted">
                      {t("admin.hero.noImage")}
                    </span>
                  )}
                </div>
                <label className={buttonClass("secondary", "slim", "w-full")}>
                  {uploading === r.key ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                  {uploading === r.key ? t("adminHero.uploading") : t("adminHero.upload")}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploading !== null}
                    onChange={(e) => {
                      void onPick(r.key, e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <p className="text-xs text-admin-muted">{t("adminHero.imageHelp")}</p>
              </div>

              <div className="space-y-4">
                <FormGrid>
                  <Field label={t("adminHero.eyebrow", { lang: "ID" })}>
                    <TextInput maxLength={80} value={r.eyebrow_id} onChange={(e) => setText(r.key, "eyebrow_id", e.target.value)} />
                  </Field>
                  <Field label={t("adminHero.eyebrow", { lang: "EN" })}>
                    <TextInput maxLength={80} value={r.eyebrow_en} onChange={(e) => setText(r.key, "eyebrow_en", e.target.value)} />
                  </Field>
                  <Field label={t("adminHero.headline", { lang: "ID" })}>
                    <TextInput required maxLength={160} value={r.title_id} onChange={(e) => setText(r.key, "title_id", e.target.value)} />
                  </Field>
                  <Field label={t("adminHero.headline", { lang: "EN" })}>
                    <TextInput required maxLength={160} value={r.title_en} onChange={(e) => setText(r.key, "title_en", e.target.value)} />
                  </Field>
                  <Field label={t("adminHero.sub", { lang: "ID" })}>
                    <TextArea rows={2} className="min-h-16" maxLength={300} value={r.subtitle_id} onChange={(e) => setText(r.key, "subtitle_id", e.target.value)} />
                  </Field>
                  <Field label={t("adminHero.sub", { lang: "EN" })}>
                    <TextArea rows={2} className="min-h-16" maxLength={300} value={r.subtitle_en} onChange={(e) => setText(r.key, "subtitle_en", e.target.value)} />
                  </Field>
                  <Field label={t("adminHero.href")}>
                    <TextInput required maxLength={300} value={r.href} onChange={(e) => setText(r.key, "href", e.target.value)} />
                  </Field>
                  <Field label={t("adminHero.alt")}>
                    <TextInput maxLength={200} value={r.alt} onChange={(e) => setText(r.key, "alt", e.target.value)} />
                  </Field>
                </FormGrid>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#d4d4d4] pt-5">
        <Button disabled={rows.length >= MAX_SLIDES} onClick={() => setRows((rs) => [...rs, emptyRow()])}>
          <Plus /> {t("adminHero.add")}
        </Button>
        <Button variant="primary" loading={isPending} disabled={uploading !== null} onClick={onSave}>
          {t("adminHero.save")}
        </Button>
      </div>
    </>
  );
}

export default function AdminHeroPage() {
  const { t } = useLanguage();
  const { data, isLoading, isError, refetch } = useAdminHeroSlides();

  return (
    <Page>
      <PageHeader icon={ImageIcon} title={t("adminHero.title")} subtitle={t("adminHero.subtitle")} />
      {isLoading ? (
        <Card>
          <LoadingState />
        </Card>
      ) : isError || !data ? (
        <Card>
          <ErrorState onRetry={() => refetch()} />
        </Card>
      ) : (
        <HeroEditor initial={data} />
      )}
    </Page>
  );
}
