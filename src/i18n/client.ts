import { translate } from "./catalog";
import { getLocale, setLocale, subscribeLocale } from "./locale";

// Astro content is static. React islands translate via their own locale subscription.
const excluded =
  "astro-island, script, style, pre, code, math, .katex, [translate=no], [data-no-translate]";
const texts: { node: Text; original: string }[] = [];
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
while (walker.nextNode()) {
  const node = walker.currentNode as Text;
  if (node.textContent?.trim() && !node.parentElement?.closest(excluded)) {
    texts.push({ node, original: node.data });
  }
}
const attributes: { element: Element; name: string; original: string }[] = [];
for (const element of document.querySelectorAll(
  "[aria-label], [alt], [title], [placeholder], meta[name=description], meta[property^='og:']",
)) {
  if (element.closest(excluded)) continue;
  for (const name of ["aria-label", "alt", "title", "placeholder", "content"]) {
    const original = element.getAttribute(name);
    if (
      original &&
      !(name === "content" && /^(https?:|website$|article$)/.test(original))
    )
      attributes.push({ element, name, original });
  }
}
const originalTitle = document.title;
const button = document.querySelector<HTMLButtonElement>(
  "[data-language-toggle]",
);
const links = [
  ...document.querySelectorAll<HTMLAnchorElement>("a[href]"),
].filter((link) => {
  const url = new URL(link.getAttribute("href") ?? "", location.href);
  return (
    !link.closest(excluded) &&
    url.origin === location.origin &&
    !link.hasAttribute("download") &&
    !link.getAttribute("href")?.startsWith("#") &&
    !/\.[a-z0-9]+$/i.test(url.pathname)
  );
});
const update = () => {
  const locale = getLocale();
  for (const { node, original } of texts)
    node.data = translate(original, locale);
  for (const { element, name, original } of attributes)
    element.setAttribute(name, translate(original, locale));
  document.title = translate(originalTitle, locale);
  button?.setAttribute(
    "aria-label",
    locale === "en"
      ? "Switch to Chinese / 切换到中文"
      : "Switch to English / 切换到英文",
  );
  button?.setAttribute("aria-pressed", String(locale === "zh-CN"));
  // Carry preference even if storage is blocked; retain hashes and other query parameters.
  for (const link of links) {
    const url = new URL(link.getAttribute("href") ?? "", location.href);
    if (locale === "zh-CN") url.searchParams.set("lang", "zh");
    else if (new URL(location.href).searchParams.has("lang"))
      url.searchParams.set("lang", "en");
    link.setAttribute("href", url.pathname + url.search + url.hash);
  }
  for (const time of document.querySelectorAll<HTMLTimeElement>(
    "time[datetime]",
  )) {
    if (
      time.closest(excluded) ||
      /^\d{4}$/.test(time.textContent?.trim() ?? "")
    )
      continue;
    const date = new Date(time.dateTime);
    if (!Number.isNaN(date.valueOf()))
      time.textContent = date.toLocaleDateString(locale, {
        dateStyle: "long",
        timeZone: "UTC",
      });
  }
};
button?.addEventListener("click", () =>
  setLocale(getLocale() === "en" ? "zh-CN" : "en"),
);
subscribeLocale(update);
update();

// Theme labels can change independently of language. Observe only that button.
const themeButton = document.querySelector("[data-theme-toggle]");
if (themeButton) {
  const observer = new MutationObserver(() => {
    observer.disconnect();
    const original = themeButton.getAttribute("aria-label") ?? "";
    const label =
      original.includes("light") || original.includes("浅色")
        ? "Use light theme"
        : "Use dark theme";
    const record = attributes.find(
      (entry) => entry.element === themeButton && entry.name === "aria-label",
    );
    if (record) record.original = label;
    themeButton.setAttribute("aria-label", translate(label, getLocale()));
    observer.observe(themeButton, {
      attributes: true,
      attributeFilter: ["aria-label"],
    });
  });
  observer.observe(themeButton, {
    attributes: true,
    attributeFilter: ["aria-label"],
  });
}
