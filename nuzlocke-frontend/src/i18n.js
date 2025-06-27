import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Importiere deine Übersetzungsdateien
import translationEN from './locales/en/translation.json';
import translationDE from './locales/de/translation.json';

// Die Ressourcen (Übersetzungen)
const resources = {
  en: {
    translation: translationEN,
  },
  de: {
    translation: translationDE,
  },
};

i18n
  .use(initReactI18next) // Übergibt i18n an react-i18next
  .init({
    resources,
    lng: 'de', // Standardsprache
    fallbackLng: 'en', // Fallback-Sprache, wenn eine Übersetzung fehlt
    interpolation: {
      escapeValue: false, // Nicht nötig für React, da es schon vor XSS schützt
    },
  });

export default i18n;
