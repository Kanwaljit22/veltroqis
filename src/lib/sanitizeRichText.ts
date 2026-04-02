import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'img'];
const ALLOWED_ATTR = ['src', 'alt', 'class', 'width', 'height'];

/** Safe HTML for sprint goals and other stored rich text (TipTap output). */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

/** Strip empty editor output; keep content when only images are present. */
export function normalizeSprintGoalHtml(html: string | undefined): string | undefined {
  if (!html?.trim()) return undefined;
  const clean = sanitizeRichText(html);
  const hasImg = /<img[\s>]/i.test(clean);
  const text = clean.replace(/<[^>]*>/g, ' ').replace(/\s|&nbsp;/g, ' ').trim();
  if (!text.length && !hasImg) return undefined;
  return clean;
}
