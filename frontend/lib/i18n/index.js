import { en } from "./en";
import { fr } from "./fr";
import { ar } from "./ar";

export const translations = {
  en,
  fr,
  ar,
};

export const languages = [
  { code: "en", name: "English", nativeName: "English", dir: "ltr" },
  { code: "fr", name: "French", nativeName: "Français", dir: "ltr" },
  { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl" },
];

export default translations;
