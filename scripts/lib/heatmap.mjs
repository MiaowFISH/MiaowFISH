import { escapeXml } from "./svg.mjs";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FONT = "Consolas, Menlo, monospace";

function levelFor(count) {
  if (!count) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

export function buildHeatmap({ theme, weeks, x, y, cell = 10, gap = 3 }) {
  const step = cell + gap;
  const cells = [];
  const labels = [];
  let lastMonth = -1;
  let lastLabelWeek = -10;

  weeks.forEach((week, weekIndex) => {
    const firstDay = week.contributionDays[0];
    if (!firstDay) return;

    const date = new Date(`${firstDay.date}T00:00:00Z`);
    const month = date.getUTCMonth();
    if (month !== lastMonth && weekIndex - lastLabelWeek >= 3) {
      labels.push(
        `<text x="${x + weekIndex * step}" y="${y - 7}" font-size="11" font-family="${FONT}" fill="${theme.muted}">${MONTHS[month]}</text>`
      );
      lastMonth = month;
      lastLabelWeek = weekIndex;
    }

    for (const day of week.contributionDays) {
      const dayIndex = Number.isInteger(day.weekday)
        ? day.weekday
        : new Date(`${day.date}T00:00:00Z`).getUTCDay();
      const level = levelFor(day.contributionCount);
      const fill = theme.heatmap[level];
      const stroke = level === 0 ? ` stroke="${theme.heatmapStroke}"` : "";
      cells.push(
        `<rect x="${x + weekIndex * step}" y="${y + dayIndex * step}" width="${cell}" height="${cell}" rx="2" fill="${fill}"${stroke}><title>${escapeXml(`${day.date}: ${day.contributionCount}`)}</title></rect>`
      );
    }
  });

  return {
    svg: cells.join(""),
    labels: labels.join(""),
    width: Math.max(0, weeks.length * step - gap)
  };
}

export function buildHeatmapLegend({ theme, x, y, cell = 10, gap = 3 }) {
  const step = cell + gap;
  const squares = theme.heatmap.map((color, index) => {
    const stroke = index === 0 ? ` stroke="${theme.heatmapStroke}"` : "";
    return `<rect x="${x + 38 + index * step}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${color}"${stroke}/>`;
  }).join("");

  return `<text x="${x}" y="${y + 9}" font-size="11" font-family="${FONT}" fill="${theme.muted}">Less</text>${squares}<text x="${x + 38 + theme.heatmap.length * step + 5}" y="${y + 9}" font-size="11" font-family="${FONT}" fill="${theme.muted}">More</text>`;
}
