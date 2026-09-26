export type Locale = "en" | "id";

import { en } from "./messages/en/index";
import { id } from "./messages/id/index";

export const dictionaries = { en, id };

// Ekstrak semua tipe key yang mungkin (harus identik antara ID dan EN)
export type Dictionary = typeof id;
export type MessageKey = keyof Dictionary;

export function t(locale: Locale, key: MessageKey, params?: Record<string, string | number>): string {
  const dict = dictionaries[locale] || dictionaries["id"];
  let text = dict[key] || dictionaries["id"][key] || key;
  
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`{${k}}`, "g"), String(v));
    }
  }
  return text;
}
