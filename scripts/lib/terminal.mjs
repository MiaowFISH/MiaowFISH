import { escapeXml } from "./svg.mjs";

export function terminalFrame({ theme, width, height, title, x = 20, y = 20, headerHeight = 40 }) {
  const frameWidth = width - x * 2;
  const frameHeight = height - y * 2;
  const bodyTop = y + headerHeight;
  const controlsX = x + 18;
  const controlsY = y + 20;

  return {
    x,
    y,
    width: frameWidth,
    height: frameHeight,
    bodyTop,
    contentX: x + 32,
    svg: [
      `<rect x="${x}" y="${y}" width="${frameWidth}" height="${frameHeight}" rx="10" fill="${theme.frame}"/>`,
      `<rect x="${x + 1}" y="${bodyTop}" width="${frameWidth - 2}" height="${frameHeight - headerHeight - 1}" fill="${theme.body}"/>`,
      `<rect x="${x + 1}" y="${y + 1}" width="${frameWidth - 2}" height="${headerHeight}" rx="8" fill="${theme.header}"/>`,
      `<circle cx="${controlsX}" cy="${controlsY}" r="6" fill="#ff5f56"/>`,
      `<circle cx="${controlsX + 20}" cy="${controlsY}" r="6" fill="#ffbd2e"/>`,
      `<circle cx="${controlsX + 40}" cy="${controlsY}" r="6" fill="#27c93f"/>`,
      `<text x="${x + frameWidth / 2}" y="${y + 25}" font-size="12" font-family="Consolas, Menlo, monospace" fill="${theme.titleText}" text-anchor="middle">${escapeXml(title)}</text>`,
      `<line x1="${x + 1}" y1="${bodyTop}" x2="${x + frameWidth - 1}" y2="${bodyTop}" stroke="${theme.border}" stroke-width="1"/>`
    ]
  };
}

export function promptRow({ theme, x, y, user, command, fontSize = 14, cursor = false, separator = " ~ % " }) {
  const cursorSpan = cursor ? `<tspan fill="${theme.text}">█</tspan>` : "";
  return `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="Consolas, Menlo, monospace"><tspan fill="${theme.green}">${escapeXml(user)}@github</tspan><tspan fill="${theme.text}">${escapeXml(separator)}</tspan><tspan fill="${theme.blue}">${escapeXml(command)}</tspan>${cursorSpan}</text>`;
}
