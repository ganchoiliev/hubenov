import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { z } from 'zod';

import bg from '@/locales/bg.json';
import en from '@/locales/en.json';

/**
 * BG-first i18n (§0). Default locale `bg`, fallback `en`. Choice persists in
 * localStorage so diaspora users keep their language across visits.
 */
export const SUPPORTED_LOCALES = ['bg', 'en'] as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      bg: { translation: bg },
      en: { translation: en },
    },
    fallbackLng: 'bg',
    supportedLngs: SUPPORTED_LOCALES,
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      // Bulgarian-first (§0): ignore the browser's navigator language so a
      // first-time visitor always lands in `bg` (the fallback). Only an
      // explicit switch — persisted in localStorage — overrides it.
      order: ['localStorage'],
      lookupLocalStorage: 'hubenov.locale',
      caches: ['localStorage'],
    },
  });

// Keep <html lang> in sync with the active locale (screen-reader pronunciation + SEO).
const applyHtmlLang = (lng?: string) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = (lng ?? i18n.resolvedLanguage) === 'en' ? 'en' : 'bg';
  }
};
applyHtmlLang();
i18n.on('languageChanged', applyHtmlLang);

// Localised Zod validation messages (BG-first) so forms never show the English
// "required" on a Bulgarian site. Field-specific messages still take priority;
// this only covers the generic ones (required / too small / invalid).
const tr = (bg: string, en: string) => (i18n.resolvedLanguage === 'en' ? en : bg);
const zodErrorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.received === 'undefined' || issue.received === 'null')
      return { message: tr('Задължително поле', 'Required') };
    if (issue.expected === 'number') return { message: tr('Въведете число', 'Enter a number') };
  }
  if (issue.code === z.ZodIssueCode.too_small) {
    if (issue.type === 'string') return { message: tr('Задължително поле', 'Required') };
    if (issue.type === 'number') return { message: tr('Стойността е твърде малка', 'Value too small') };
  }
  if (issue.code === z.ZodIssueCode.invalid_string) {
    return { message: tr('Невалидна стойност', 'Invalid value') };
  }
  return { message: ctx.defaultError };
};
z.setErrorMap(zodErrorMap);

export default i18n;
