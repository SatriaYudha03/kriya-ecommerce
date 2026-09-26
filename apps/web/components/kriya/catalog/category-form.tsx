"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { useAdminCategory, useAdminCategories, useCreateCategory, useUpdateCategory } from "@/lib/catalog/queries";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AdminCategoryInput } from "@/lib/catalog/types";

export function CategoryForm({ categoryId, onClose }: { categoryId?: string; onClose: () => void }) {
  const isEdit = Boolean(categoryId);
  const { data: cat, isLoading } = useAdminCategory(categoryId as string, isEdit);
  const { data: categories } = useAdminCategories();
  
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory(categoryId as string);
  const mut = isEdit ? updateMut : createMut;

  const [formData, setFormData] = useState<AdminCategoryInput>({
    slug: "",
    name: "",
    parent_id: undefined,
    description_i18n: { id: "" },
    image_path: undefined,
    position: 0,
    is_active: true,
  });

  useEffect(() => {
    if (cat) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        slug: cat.slug,
        name: cat.name,
        parent_id: cat.parent_id,
        description_i18n: cat.description_i18n || { id: "" },
        image_path: cat.image_path,
        position: cat.position,
        is_active: cat.is_active,
      });
    }
  }, [cat]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mut.mutate(formData, {
      onSuccess: () => onClose()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-neutral-900">
            {isEdit ? "Edit Kategori" : "Tambah Kategori"}
          </h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-neutral-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <form onSubmit={onSubmit} className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Kategori</Label>
                <Input id="name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="mt-1.5" />
              </div>

              <div>
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input id="slug" required value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} className="mt-1.5" />
              </div>

              <div>
                <Label>Kategori Induk</Label>
                <Select value={formData.parent_id ?? "none"} onValueChange={(val) => setFormData({ ...formData, parent_id: val === "none" ? undefined : val })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Pilih kategori induk..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Tanpa Induk --</SelectItem>
                    {categories?.filter(c => c.id !== categoryId).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="desc">Deskripsi</Label>
                <Input id="desc" value={formData.description_i18n.id || ""} onChange={e => setFormData({ ...formData, description_i18n: { id: e.target.value } })} className="mt-1.5" />
              </div>

              <div>
                <Label htmlFor="image_path">Path Gambar (Opsional)</Label>
                <Input id="image_path" value={formData.image_path || ""} onChange={e => setFormData({ ...formData, image_path: e.target.value || undefined })} className="mt-1.5" placeholder="katalog/categories/xxx.jpg" />
              </div>

              <div>
                <Label htmlFor="position">Posisi (Urutan)</Label>
                <Input id="position" type="number" value={formData.position} onChange={e => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })} className="mt-1.5" />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
                <div>
                  <Label className="text-base">Aktif</Label>
                  <p className="text-sm text-neutral-500">Tampilkan kategori ini kepada publik</p>
                </div>
                <Switch checked={formData.is_active} onCheckedChange={val => setFormData({ ...formData, is_active: val })} />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={mut.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-strong px-4 py-2 text-sm font-medium text-white hover:bg-brand disabled:opacity-50"
              >
                {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
