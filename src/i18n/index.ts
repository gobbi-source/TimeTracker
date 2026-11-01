import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import it from './locales/it.json';
import en from './locales/en.json';

i18n.use(initReactI18next).init({
  resources: {
    it: { translation: it },
    en: { translation: en },
  },
  lng: 'it', // Italian as default as requested
  fallbackLng: 'it',
  interpolation: {
    escapeValue: false, // React already safes from XSS
  },
});

export default i18n;
