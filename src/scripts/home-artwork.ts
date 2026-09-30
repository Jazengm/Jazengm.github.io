import { translate } from "../i18n/catalog";
import { getLocale, subscribeLocale } from "../i18n/locale";

interface Artwork {
  title: string;
  src: string;
  href: string;
}

const hour = 60 * 60 * 1000;
const link = document.querySelector<HTMLAnchorElement>("[data-home-artwork]");
const image = link?.querySelector("img");
const caption = link?.querySelector("span");

if (link && image && caption) {
  const artworks: Artwork[] = JSON.parse(link.dataset.artworks ?? "[]");
  let current = 0;
  let requested = 0;
  let generation = 0;
  let timer: ReturnType<typeof setTimeout>;

  const label = () => {
    const artwork = artworks[current];
    const locale = getLocale();
    caption.textContent = translate(artwork.title, locale);
    link.setAttribute("aria-label", translate(`View ${artwork.title}`, locale));
    link.href = artwork.href + (locale === "zh-CN" ? "?lang=zh" : "");
  };

  const update = () => {
    clearTimeout(timer);
    const now = Date.now();
    const index = Math.floor(now / hour) % artworks.length;
    if (index !== requested) {
      requested = index;
      const token = ++generation;
      const next = new Image();
      next.src = artworks[index].src;
      // Keep a working image/title/link together if loading fails or races.
      next.decode().then(
        () => {
          if (token !== generation) return;
          current = index;
          image.src = artworks[index].src;
          label();
        },
        () => {
          if (token === generation) requested = current;
        },
      );
    }
    timer = setTimeout(update, hour - (now % hour));
  };
  const onVisibility = () => {
    if (!document.hidden) update();
  };
  let unsubscribe = () => {};
  const start = () => {
    unsubscribe();
    unsubscribe = subscribeLocale(label);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", update);
    label();
    update();
  };
  window.addEventListener("pagehide", () => {
    clearTimeout(timer);
    generation++;
    requested = current;
    unsubscribe();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("focus", update);
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) start();
  });
  start();
}
