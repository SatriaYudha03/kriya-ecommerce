"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { AlertCircle, ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/kriya/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="space-y-6">
      {rows.map((r, i) => (
        <section key={r.key} className="space-y-4 rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{t("adminHero.slide", { n: i + 1 })}</h2>
            <div className="flex items-center gap-1">
              <label className="mr-3 flex items-center gap-2 text-sm">
                <Switch checked={r.is_active} onCheckedChange={(v) => patch(r.key, { is_active: v })} />
                {t("adminHero.active")}
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("adminHero.moveUp")}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("adminHero.moveDown")}
                disabled={i === rows.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("adminHero.remove")}
                disabled={rows.length === 1}
                onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-[260px_1fr]">
            <div className="space-y-2">
              <Label>{t("adminHero.image")}</Label>
              <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
                {r.image_url ? (
                  <Image src={r.image_url} alt={r.alt} fill sizes="260px" className="object-cover" />
                ) : null}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                {uploading === r.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
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
              <p className="text-xs text-muted-foreground">{t("adminHero.imageHelp")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{t("adminHero.eyebrow", { lang: "ID" })}</Label>
                  <Input maxLength={80} value={r.eyebrow_id} onChange={(e) => setText(r.key, "eyebrow_id", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("adminHero.headline", { lang: "ID" })}</Label>
                  <Input required maxLength={160} value={r.title_id} onChange={(e) => setText(r.key, "title_id", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("adminHero.sub", { lang: "ID" })}</Label>
                  <Textarea rows={2} maxLength={300} value={r.subtitle_id} onChange={(e) => setText(r.key, "subtitle_id", e.target.value)} />
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{t("adminHero.eyebrow", { lang: "EN" })}</Label>
                  <Input maxLength={80} value={r.eyebrow_en} onChange={(e) => setText(r.key, "eyebrow_en", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("adminHero.headline", { lang: "EN" })}</Label>
                  <Input required maxLength={160} value={r.title_en} onChange={(e) => setText(r.key, "title_en", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("adminHero.sub", { lang: "EN" })}</Label>
                  <Textarea rows={2} maxLength={300} value={r.subtitle_en} onChange={(e) => setText(r.key, "subtitle_en", e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("adminHero.href")}</Label>
                <Input required maxLength={300} value={r.href} onChange={(e) => setText(r.key, "href", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("adminHero.alt")}</Label>
                <Input maxLength={200} value={r.alt} onChange={(e) => setText(r.key, "alt", e.target.value)} />
              </div>
            </div>
          </div>
        </section>
      ))}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={rows.length >= MAX_SLIDES}
          onClick={() => setRows((rs) => [...rs, emptyRow()])}
        >
          <Plus className="mr-2 h-4 w-4" /> {t("adminHero.add")}
        </Button>
        <Button type="button" disabled={isPending || uploading !== null} onClick={onSave}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("adminHero.save")}
        </Button>
      </div>
    </div>
  );
}

export default function AdminHeroPage() {
  const { t } = useLanguage();
  const { data, isLoading, isError, refetch } = useAdminHeroSlides();

  return (
    <div className="max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">{t("adminHero.title")}</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">{t("adminHero.subtitle")}</p>
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground" role="status">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <HeroEditor initial={data} />
      )}
    </div>
  );
}
