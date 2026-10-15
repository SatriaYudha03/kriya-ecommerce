"use client";

import { useState } from "react";
import { useAdminCategory, useAdminCategories, useCreateCategory, useUpdateCategory } from "@/lib/catalog/queries";
import type { AdminCategoryInput } from "@/lib/catalog/types";
import { useLanguage } from "../language-provider";
import {
  Button,
  Field,
  FormGrid,
  LoadingState,
  Modal,
  SelectInput,
  TextInput,
  ToggleRow,
} from "@/components/kriya/admin/ui";

const EMPTY: AdminCategoryInput = {
  slug: "",
  name: "",
  parent_id: undefined,
  description_i18n: { id: "" },
  image_path: undefined,
  position: 0,
  is_active: true,
};

export function CategoryForm({ categoryId, onClose }: { categoryId?: string; onClose: () => void }) {
  const { t } = useLanguage();
  const isEdit = Boolean(categoryId);
  const { data: cat, isLoading } = useAdminCategory(categoryId as string, isEdit);
  const { data: categories } = useAdminCategories();

  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory(categoryId as string);
  const mut = isEdit ? updateMut : createMut;

  const [formData, setFormData] = useState<AdminCategoryInput>(EMPTY);

  // Prefill saat render (sekali), pola yang sama dengan editor produk.
  const [seeded, setSeeded] = useState(false);
  if (cat && !seeded) {
    setSeeded(true);
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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mut.mutate(formData, { onSuccess: () => onClose() });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? t("adminCatalog.categoryForm.editTitle") : t("adminCatalog.categoryForm.addTitle")}
      footer={
        <>
          <Button onClick={onClose}>{t("adminCatalog.categoryForm.cancel")}</Button>
          <Button type="submit" form="category-form" variant="primary" loading={mut.isPending}>
            {t("adminCatalog.categoryForm.save")}
          </Button>
        </>
      }
    >
      {isEdit && isLoading ? (
        <LoadingState />
      ) : (
        <form id="category-form" onSubmit={onSubmit} className="space-y-4">
          <FormGrid>
            <Field label={t("adminCatalog.categoryForm.name")} htmlFor="cat-name">
              <TextInput
                id="cat-name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Field>
            <Field label={t("adminCatalog.categoryForm.slug")} htmlFor="cat-slug">
              <TextInput
                id="cat-slug"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </Field>
          </FormGrid>

          <FormGrid>
            <Field label={t("adminCatalog.categoryForm.parent")} htmlFor="cat-parent">
              <SelectInput
                id="cat-parent"
                value={formData.parent_id ?? ""}
                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || undefined })}
              >
                <option value="">{t("adminCatalog.categoryForm.noParent")}</option>
                {categories
                  ?.filter((c) => c.id !== categoryId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </SelectInput>
            </Field>
            <Field label={t("adminCatalog.categoryForm.position")} htmlFor="cat-position">
              <TextInput
                id="cat-position"
                type="number"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })}
              />
            </Field>
          </FormGrid>

          <Field label={t("adminCatalog.categoryForm.description")} htmlFor="cat-desc">
            <TextInput
              id="cat-desc"
              value={formData.description_i18n.id || ""}
              onChange={(e) => setFormData({ ...formData, description_i18n: { id: e.target.value } })}
            />
          </Field>

          <Field label={t("adminCatalog.categoryForm.imagePath")} htmlFor="cat-image">
            <TextInput
              id="cat-image"
              value={formData.image_path || ""}
              onChange={(e) => setFormData({ ...formData, image_path: e.target.value || undefined })}
              placeholder="katalog/categories/xxx.jpg"
            />
          </Field>

          <div className="rounded-xl border border-admin-border p-3">
            <ToggleRow
              label={t("adminCatalog.categoryForm.active")}
              help={t("adminCatalog.categoryForm.activeHint")}
              checked={formData.is_active ?? true}
              onChange={(val) => setFormData({ ...formData, is_active: val })}
            />
          </div>
        </form>
      )}
    </Modal>
  );
}
