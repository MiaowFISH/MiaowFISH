import { escapeXml, formatNumber, truncateDisplay } from "./svg.mjs";

const FONT = "Consolas, Menlo, monospace";

export function buildProjects({ theme, projects, x, y, width, rowHeight = 36 }) {
  if (projects.length === 0) {
    return `<text x="${x}" y="${y}" font-size="12" font-family="${FONT}" fill="${theme.muted}">no featured repositories</text>`;
  }

  return projects.map((project, index) => {
    const top = y + index * rowHeight;
    const name = truncateDisplay(project.fullName, 30);
    const description = truncateDisplay(project.description || "—", 30);
    const language = truncateDisplay(project.language || "—", 12);
    const languageColor = project.language === "—" ? theme.muted : theme.blue;

    return [
      `<text x="${x}" y="${top}" font-size="12" font-family="${FONT}" fill="${theme.green}">${escapeXml(name)}</text>`,
      `<text x="${x + width}" y="${top}" font-size="12" font-family="${FONT}" fill="${theme.yellow}" text-anchor="end">* ${escapeXml(formatNumber(project.stars))}</text>`,
      `<text x="${x}" y="${top + 16}" font-size="11.5" font-family="${FONT}" fill="${theme.text}">${escapeXml(description)}</text>`,
      `<text x="${x + width}" y="${top + 16}" font-size="11" font-family="${FONT}" fill="${languageColor}" text-anchor="end">${escapeXml(language)}</text>`
    ].join("");
  }).join("");
}
