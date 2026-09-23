import {
  Children,
  cloneElement,
  isValidElement,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { translate, type Locale } from "./catalog";
import { getLocale, subscribeLocale } from "./locale";

export const useLocale = () =>
  useSyncExternalStore(subscribeLocale, getLocale, (): Locale => "en");

/** Translate React-owned text through React itself, preserving state and hydration. */
export function localize(node: ReactNode, locale: Locale): ReactNode {
  if (typeof node === "string") return translate(node, locale);
  if (Array.isArray(node))
    return Children.map(node, (child) => localize(child, locale));
  if (!isValidElement<Record<string, unknown>>(node)) return node;
  if (
    ["code", "pre", "math", "script", "style"].includes(String(node.type)) ||
    node.props.translate === "no"
  )
    return node;
  // Child components own their translations; never change their data or identifiers.
  if (typeof node.type === "function") return node;
  const props: Record<string, unknown> = {};
  if (
    node.type === "a" &&
    typeof node.props.href === "string" &&
    node.props.href.startsWith("/") &&
    !node.props.href.startsWith("//") &&
    locale === "zh-CN"
  ) {
    const url = new URL(node.props.href, "https://local.invalid");
    if (!/\.[a-z0-9]+$/i.test(url.pathname)) {
      url.searchParams.set("lang", "zh");
      props.href = url.pathname + url.search + url.hash;
    }
  }
  for (const key of ["aria-label", "title", "alt", "placeholder"]) {
    if (typeof node.props[key] === "string")
      props[key] = translate(node.props[key], locale);
  }
  if ("children" in node.props)
    props.children = localize(node.props.children as ReactNode, locale);
  return cloneElement(node, props);
}
