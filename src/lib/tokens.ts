/**
 * `"{a} of {b}"` → token replacement without a template engine.
 *
 * Lives in `lib/` because both sides need it: the estimator's copy is filled
 * server-side for the markup a visitor lands on, and again client-side when a
 * selection changes the numbers inside it. An unknown token is left standing,
 * so a typo shows up in the page instead of silently blanking a sentence.
 */
export function fill(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => tokens[key] ?? `{${key}}`);
}
