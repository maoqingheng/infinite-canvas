/**
 * Simple className merge utility.
 * Taro does not use Tailwind, so we keep a lightweight helper
 * that handles conditional class concatenation.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
