import { escapeXml, formatRelativeTime, truncateDisplay } from "./svg.mjs";

const FONT = "Consolas, Menlo, monospace";

export function buildCommits({ theme, commits, x, y, width, rowHeight = 36 }) {
  if (commits.length === 0) {
    return `<text x="${x}" y="${y}" font-size="12" font-family="${FONT}" fill="${theme.muted}">no public commit events</text>`;
  }

  return commits.map((commit, index) => {
    const top = y + index * rowHeight;
    const repo = truncateDisplay(commit.repo, 22);
    const message = truncateDisplay(commit.message, 42);
    const relative = formatRelativeTime(commit.date);

    return [
      `<circle cx="${x + 4}" cy="${top - 4}" r="3" fill="${theme.green}"/>`,
      `<text x="${x + 14}" y="${top}" font-size="12" font-family="${FONT}" fill="${theme.yellow}">${escapeXml(commit.sha)}</text>`,
      `<text x="${x + 70}" y="${top}" font-size="12" font-family="${FONT}" fill="${theme.cyan}">${escapeXml(repo)}</text>`,
      `<text x="${x + width}" y="${top}" font-size="11" font-family="${FONT}" fill="${theme.muted}" text-anchor="end">${escapeXml(relative)}</text>`,
      `<text x="${x + 14}" y="${top + 16}" font-size="12" font-family="${FONT}" fill="${theme.text}">${escapeXml(message)}</text>`
    ].join("");
  }).join("");
}
