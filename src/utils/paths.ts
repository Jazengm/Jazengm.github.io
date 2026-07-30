const base = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

export function withBase(path: string): string {
  if (
    /^(?:[a-z]+:)?\/\//i.test(path) ||
    path.startsWith("#") ||
    path.startsWith("mailto:")
  ) {
    return path;
  }
  return `${base}${path.replace(/^\//, "")}`;
}

export function isExternal(path: string): boolean {
  return /^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith("mailto:");
}
