export function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const WIDE_CHAR =
  /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/u;

function charWidth(char) {
  return WIDE_CHAR.test(char) ? 2 : 1;
}

function displayWidth(text) {
  let width = 0;
  for (const char of String(text)) {
    width += charWidth(char);
  }
  return width;
}

export function truncateDisplay(text, maxWidth) {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  if (displayWidth(value) <= maxWidth) return value;

  let result = "";
  let width = 0;
  for (const char of value) {
    const next = charWidth(char);
    if (width + next > maxWidth - 3) break;
    result += char;
    width += next;
  }
  return `${result}...`;
}

export function formatNumber(value) {
  return Number(value ?? 0).toLocaleString("en-US");
}

export function formatUptime(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  if (Number.isNaN(created.getTime())) return "unknown";

  let years = now.getUTCFullYear() - created.getUTCFullYear();
  let months = now.getUTCMonth() - created.getUTCMonth();
  let days = now.getUTCDate() - created.getUTCDate();

  if (days < 0) {
    months -= 1;
    const previousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    days += previousMonth.getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (months > 0) parts.push(`${months} month${months === 1 ? "" : "s"}`);
  if (parts.length === 0) parts.push(`${Math.max(0, days)} day${days === 1 ? "" : "s"}`);
  return parts.join(", ");
}

export function formatRelativeTime(isoDate, now = Date.now()) {
  if (!isoDate) return "";
  const elapsed = Math.max(0, Math.floor((now - new Date(isoDate).getTime()) / 1000));
  if (elapsed < 60) return "just now";

  const minutes = Math.floor(elapsed / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  return `${Math.floor(days / 365)}y ago`;
}
