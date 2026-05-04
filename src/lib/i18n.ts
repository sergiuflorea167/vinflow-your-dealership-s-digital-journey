// Lightweight i18n: keyed string map with DE (default) + EN.
// Use via const t = useT();  t("profile.edit")
import { useLanguageStore, Lang } from "@/store/languageStore";

type Dict = Record<string, string>;

const DE: Dict = {
  // Topbar / Search
  "search.placeholder": "Suche…",
  "topbar.notifications": "Benachrichtigungen",

  // User menu
  "menu.editProfile": "Profil bearbeiten",
  "menu.settings": "Stammdaten & Einstellungen",
  "menu.logout": "Abmelden",
  "menu.logout.demo": "Demo-Modus – Logout aktuell deaktiviert",
  "menu.language": "Sprache",
  "menu.language.de": "Deutsch",
  "menu.language.en": "Englisch",

  // Profile dialog
  "profile.title": "Profil bearbeiten",
  "profile.desc": "Diese Daten erscheinen im Dashboard, in Belegen und im Aktivitätslog.",
  "profile.uploadHint": "Klicke auf das Bild, um ein Foto hochzuladen.",
  "profile.firstName": "Vorname",
  "profile.lastName": "Nachname",
  "profile.role": "Rolle / Position",
  "profile.rolePlaceholder": "z. B. Geschäftsführer",
  "profile.email": "E-Mail",
  "profile.phone": "Telefon",
  "profile.company": "Firma",
  "profile.cancel": "Abbrechen",
  "profile.save": "Speichern",
  "profile.saved": "Profil gespeichert",

  // Greetings
  "greeting.morning": "Guten Morgen",
  "greeting.day": "Guten Tag",
  "greeting.evening": "Guten Abend",
  "greeting.welcomeBack": "Willkommen zurück",

  // Common
  "common.language": "Sprache",
  "language.changed": "Sprache geändert",
};

const EN: Dict = {
  "search.placeholder": "Search…",
  "topbar.notifications": "Notifications",

  "menu.editProfile": "Edit profile",
  "menu.settings": "Master data & settings",
  "menu.logout": "Sign out",
  "menu.logout.demo": "Demo mode – logout currently disabled",
  "menu.language": "Language",
  "menu.language.de": "German",
  "menu.language.en": "English",

  "profile.title": "Edit profile",
  "profile.desc": "This data appears on the dashboard, in documents and in the activity log.",
  "profile.uploadHint": "Click the image to upload a photo.",
  "profile.firstName": "First name",
  "profile.lastName": "Last name",
  "profile.role": "Role / position",
  "profile.rolePlaceholder": "e.g. Managing Director",
  "profile.email": "Email",
  "profile.phone": "Phone",
  "profile.company": "Company",
  "profile.cancel": "Cancel",
  "profile.save": "Save",
  "profile.saved": "Profile saved",

  "greeting.morning": "Good morning",
  "greeting.day": "Good afternoon",
  "greeting.evening": "Good evening",
  "greeting.welcomeBack": "Welcome back",

  "common.language": "Language",
  "language.changed": "Language changed",
};

const DICTS: Record<Lang, Dict> = { de: DE, en: EN };

export const translate = (lang: Lang, key: string) =>
  DICTS[lang]?.[key] ?? DE[key] ?? key;

export const useT = () => {
  const lang = useLanguageStore((s) => s.lang);
  return (key: string) => translate(lang, key);
};

export const useLang = () => useLanguageStore((s) => s.lang);
