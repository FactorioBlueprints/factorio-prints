export interface TaggedRouteParams {
  category: string;
  name: string;
}

// Old /tag/$tag links carry the whole tag ("belt/balancer") in one path segment.
export function legacyTagRedirectParams(tag: string): TaggedRouteParams | undefined {
  const trimmed = tag.replace(/^\/+|\/+$/g, "");
  const separator = trimmed.indexOf("/");
  if (separator <= 0 || separator === trimmed.length - 1) {
    return undefined;
  }

  return { category: trimmed.slice(0, separator), name: trimmed.slice(separator + 1) };
}
