import fs from "node:fs/promises";
import path from "node:path";

import { config } from "./config.mjs";
import {
  fetchContributionStats,
  fetchFeaturedRepos,
  fetchLanguageStats,
  fetchMaintainedStars,
  fetchRecentCommits,
  fetchUser
} from "./lib/github.mjs";
import { buildDashboardSvg } from "./lib/dashboard.mjs";
import { THEMES } from "./lib/themes.mjs";

const outputDir = path.resolve("assets");

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const featured = config.featuredRepos.map((item) => item.repo);
  const descriptions = new Map(config.featuredRepos.map((item) => [item.repo, item.description]));

  const [user, contributions, maintained, languages, commits, repositoryData] = await Promise.all([
    fetchUser(config.login),
    fetchContributionStats(config.login),
    fetchMaintainedStars(config.login, config.orgs),
    fetchLanguageStats(config.login),
    fetchRecentCommits(config.login, 6),
    fetchFeaturedRepos(featured)
  ]);

  const projects = repositoryData.map((project) => ({
    ...project,
    description: descriptions.get(project.fullName) ?? project.description
  }));

  for (const theme of Object.values(THEMES)) {
    const svg = buildDashboardSvg({
      theme,
      user,
      contributions,
      maintained,
      languages,
      commits,
      projects,
      config
    });

    const name = `dashboard-${theme.name}.svg`;
    await fs.writeFile(path.join(outputDir, name), svg);
    console.log(`${name.padEnd(22)} ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KiB`);
  }

  console.log(
    `profile: ${user.login} · ${maintained.stars} stars · ${contributions.contributionCalendar.totalContributions} contributions (1y) · ${commits.length} commits · ${projects.length} projects`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
