import { buildCommits } from "./commits.mjs";
import { buildHeatmap, buildHeatmapLegend } from "./heatmap.mjs";
import { buildProjects } from "./projects.mjs";
import { escapeXml, formatNumber, formatUptime, truncateDisplay } from "./svg.mjs";
import { promptRow, terminalFrame } from "./terminal.mjs";

const WIDTH = 920;
const HEIGHT = 880;
const FONT = "Consolas, Menlo, monospace";

function profileRows({ user, contributions, maintained, config }) {
  return [
    ["Name", `${config.displayName} (${user.login})`],
    ["Host", config.orgs.map((org) => org.login).join(" · ")],
    ["Kernel", "TypeScript · Python"],
    ["Uptime", formatUptime(user.created_at)],
    ["Repos", formatNumber(user.public_repos)],
    ["Stars", formatNumber(maintained.stars)],
    ["Contributions", `${formatNumber(contributions.contributionCalendar.totalContributions)} (1y)`],
    ["Blog", config.blog.replace(/^https?:\/\//, "").replace(/\/$/, "")],
    ["Locale", config.locale],
    ["Status", config.status]
  ];
}

function buildStack({ theme, languages, x, y, width }) {
  const labelWidth = 72;
  const barX = x + labelWidth + 8;
  const barWidth = width - labelWidth - 8 - 90;
  const percentX = x + width;

  return languages.map((language, index) => {
    const rowY = y + index * 22;
    const fillWidth = Math.max(1, Math.round((barWidth * language.percent) / 100));
    const label = truncateDisplay(language.name, 10);

    return [
      `<text x="${x}" y="${rowY}" font-size="11.5" font-family="${FONT}" fill="${theme.text}">${escapeXml(label)}</text>`,
      `<rect x="${barX}" y="${rowY - 6}" width="${barWidth}" height="6" rx="3" fill="${theme.barTrack}"/>`,
      `<rect x="${barX}" y="${rowY - 6}" width="${fillWidth}" height="6" rx="3" fill="${language.color}"/>`,
      `<text x="${percentX}" y="${rowY}" font-size="11" font-family="${FONT}" fill="${theme.muted}" text-anchor="end">${language.percent.toFixed(1)}%</text>`
    ].join("");
  }).join("");
}

export function buildDashboardSvg({ theme, user, contributions, maintained, languages, commits, projects, config }) {
  const frame = terminalFrame({
    theme,
    width: WIDTH,
    height: HEIGHT,
    title: `${config.login.toLowerCase()}@github — shell`
  });

  const promptY = frame.bodyTop + 26;
  const rows = profileRows({ user, contributions, maintained, config });
  const totalContributions = contributions.contributionCalendar.totalContributions;

  const parts = [];
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(`${config.displayName} (${user.login}) profile dashboard`)}">`
  );
  parts.push(`<title>${escapeXml(`${user.login} — profile dashboard (${theme.name})`)}</title>`);
  parts.push(...frame.svg);
  parts.push(promptRow({ theme, x: frame.contentX, y: promptY, user: user.login.toLowerCase(), command: "meowfetch", separator: " ~ $ " }));

  parts.push(
    `<text x="52" y="128" font-size="12" font-family="${FONT}" fill="${theme.green}">~/profile</text>`
  );

  rows.forEach(([label, rawValue], index) => {
    const y = 158 + index * 19;
    const value = truncateDisplay(rawValue, 32);
    parts.push(
      `<text x="52" y="${y}" font-size="13.5" font-family="${FONT}" fill="${theme.blue}">${escapeXml(label)}</text>`,
      `<text x="180" y="${y}" font-size="13.5" font-family="${FONT}" fill="${theme.text}">${escapeXml(value)}</text>`
    );
  });

  parts.push(
    `<line x1="460" y1="120" x2="460" y2="390" stroke="${theme.border}" stroke-width="1"/>`,
    `<text x="480" y="128" font-size="12" font-family="${FONT}" fill="${theme.green}">~/stack</text>`
  );
  parts.push(buildStack({ theme, languages, x: 480, y: 158, width: 388 }));
  parts.push(
    `<text x="480" y="346" font-size="10.5" font-family="${FONT}" fill="${theme.muted}">top languages by code volume</text>`
  );

  const heatmap = buildHeatmap({
    theme,
    weeks: contributions.contributionCalendar.weeks,
    x: 52,
    y: 442,
    cell: 10,
    gap: 3
  });
  const totalX = Math.max(760, 52 + heatmap.width + 18);

  parts.push(
    `<text x="52" y="402" font-size="12" font-family="${FONT}" fill="${theme.green}">~/activity</text>`,
    `<line x1="52" y1="410" x2="868" y2="410" stroke="${theme.border}" stroke-width="1"/>`,
    heatmap.labels,
    heatmap.svg,
    `<text x="${totalX}" y="470" font-size="24" font-family="${FONT}" fill="${theme.green}" font-weight="700">${formatNumber(totalContributions)}</text>`,
    `<text x="${totalX}" y="490" font-size="12" font-family="${FONT}" fill="${theme.muted}">contributions</text>`,
    `<text x="${totalX}" y="512" font-size="11" font-family="${FONT}" fill="${theme.muted}">${formatNumber(contributions.totalCommitContributions)} commits</text>`,
    `<text x="${totalX}" y="530" font-size="10.5" font-family="${FONT}" fill="${theme.muted}">${formatNumber(contributions.totalPullRequestContributions)} PRs · ${formatNumber(contributions.totalIssueContributions)} issue${contributions.totalIssueContributions === 1 ? "" : "s"}</text>`,
    `<text x="${totalX}" y="548" font-size="10.5" font-family="${FONT}" fill="${theme.muted}">last 12 months</text>`,
    buildHeatmapLegend({ theme, x: 52, y: 550, cell: 10, gap: 3 })
  );

  parts.push(
    `<text x="52" y="576" font-size="12" font-family="${FONT}" fill="${theme.green}">~/commits</text>`,
    `<text x="510" y="576" font-size="12" font-family="${FONT}" fill="${theme.green}">~/projects</text>`,
    `<line x1="52" y1="584" x2="868" y2="584" stroke="${theme.border}" stroke-width="1"/>`,
    `<line x1="490" y1="584" x2="490" y2="820" stroke="${theme.border}" stroke-width="1"/>`
  );
  parts.push(buildCommits({ theme, commits, x: 52, y: 604, width: 426, rowHeight: 36 }));
  parts.push(buildProjects({ theme, projects, x: 510, y: 604, width: 358, rowHeight: 36 }));

  parts.push(promptRow({ theme, x: frame.contentX, y: 846, user: user.login.toLowerCase(), command: "", cursor: true, separator: " ~ $ " }));

  parts.push(`</svg>`);
  return parts.join("\n");
}
