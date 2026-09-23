import type { Locale } from "./catalog";

export const languageEvent = "academic-language-change";
export const getLocale = (): Locale =>
  typeof document !== "undefined" && document.documentElement.lang === "zh-CN"
    ? "zh-CN"
    : "en";

export function subscribeLocale(callback: () => void) {
  window.addEventListener(languageEvent, callback);
  return () => window.removeEventListener(languageEvent, callback);
}

export function setLocale(locale: Locale) {
  document.documentElement.lang = locale;
  try {
    localStorage.setItem("academic-language", locale);
  } catch {
    /* URL still persists the choice. */
  }
  const url = new URL(location.href);
  url.searchParams.set("lang", locale === "zh-CN" ? "zh" : "en");
  history.replaceState(null, "", url);
  window.dispatchEvent(new Event(languageEvent));
}
