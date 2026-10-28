const API = "https://api.github.com";

const COMMIT_EVENT_TYPES = new Set(["PushEvent", "PullRequestEvent", "CreateEvent"]);
const MAX_COMMIT_REPOS = 5;
const LANGUAGE_FALLBACK_COLORS = [
  "#3178c6", "#3572A5", "#f1e05a", "#b07219", "#41b883",
  "#e34c26", "#563d7c", "#89e051", "#00ADD8", "#701516"
];

function readToken() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN or GH_TOKEN is required to generate profile cards.");
  }
  return token;
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${readToken()}`,
      "User-Agent": "miaowfish-profile",
      ...options.headers
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${path} failed: HTTP ${response.status} ${body}`);
  }
  return response.json();
}

async function graphql(query, variables = {}) {
  const payload = await request("/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables })
  });

  if (payload.errors?.length) {
    throw new Error(`GitHub GraphQL failed: ${payload.errors.map((error) => error.message).join("; ")}`);
  }
  return payload.data;
}

async function requestAll(path, params = {}) {
  const results = [];
  for (let page = 1; ; page += 1) {
    const url = new URL(path, API);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${readToken()}`,
        "User-Agent": "miaowfish-profile"
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API ${url.pathname} failed: HTTP ${response.status} ${body}`);
    }

    const chunk = await response.json();
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    results.push(...chunk);
    if (chunk.length < 100) break;
  }
  return results;
}

export async function fetchUser(login) {
  return request(`/users/${encodeURIComponent(login)}`);
}

export async function fetchRepo(fullName) {
  return request(`/repos/${fullName}`);
}

export async function fetchOwnedRepos(login) {
  return requestAll(`/users/${encodeURIComponent(login)}/repos`, {
    type: "owner",
    sort: "updated"
  });
}

export async function fetchOrgRepos(org) {
  return requestAll(`/orgs/${encodeURIComponent(org)}/repos`, {
    type: "public",
    sort: "updated"
  });
}

export async function fetchContributionStats(login) {
  const query = `
    query ProfileContributions($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
                weekday
              }
            }
          }
          totalCommitContributions
          totalPullRequestContributions
          totalIssueContributions
        }
      }
    }
  `;

  const data = await graphql(query, { login });
  return data.user.contributionsCollection;
}

async function fetchAccountLanguages(login) {
  const query = `
    query AccountLanguages($login: String!) {
      user(login: $login) {
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
          nodes {
            languages(first: 10) {
              edges { size node { name color } }
            }
          }
        }
      }
    }
  `;

  const data = await graphql(query, { login });
  return data.user?.repositories?.nodes ?? [];
}

export async function fetchLanguageStats(login) {
  const repositories = await fetchAccountLanguages(login);
  const totals = new Map();

  for (const repository of repositories) {
    for (const edge of repository.languages?.edges ?? []) {
      const name = edge.node?.name;
      if (!name || !edge.size) continue;
      const current = totals.get(name) ?? { size: 0, color: edge.node.color };
      current.size += edge.size;
      if (!current.color && edge.node.color) current.color = edge.node.color;
      totals.set(name, current);
    }
  }

  const totalSize = [...totals.values()].reduce((sum, item) => sum + item.size, 0);
  return [...totals.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 8)
    .map(([name, item], index) => ({
      name,
      size: item.size,
      percent: totalSize > 0 ? (item.size / totalSize) * 100 : 0,
      color: item.color ?? LANGUAGE_FALLBACK_COLORS[index % LANGUAGE_FALLBACK_COLORS.length]
    }));
}

async function fetchCandidateRepos(login) {
  const encoded = encodeURIComponent(login);
  const [events, repos] = await Promise.all([
    request(`/users/${encoded}/events/public?per_page=100`),
    request(`/users/${encoded}/repos?sort=pushed&per_page=${MAX_COMMIT_REPOS}`)
  ]);

  const seen = new Set();
  const candidates = [];
  const add = (fullName) => {
    if (!fullName || seen.has(fullName.toLowerCase())) return;
    seen.add(fullName.toLowerCase());
    candidates.push(fullName);
  };

  for (const event of events) {
    if (COMMIT_EVENT_TYPES.has(event.type)) add(event.repo?.name);
  }
  for (const repo of repos) add(repo.full_name);

  return candidates.slice(0, MAX_COMMIT_REPOS);
}

export async function fetchRecentCommits(login, limit = 6) {
  const repos = await fetchCandidateRepos(login);
  const author = encodeURIComponent(login);
  const results = await Promise.all(
    repos.map((repo) => request(`/repos/${repo}/commits?author=${author}&per_page=${limit}`))
  );

  const seen = new Set();
  const commits = [];
  const latestAllowed = Date.now() + 24 * 60 * 60 * 1000;

  results.forEach((items, index) => {
    const repo = repos[index];
    for (const item of items) {
      const date = item.commit?.author?.date ?? item.commit?.committer?.date;
      if (!item.sha || seen.has(item.sha)) continue;
      if (date && new Date(date).getTime() > latestAllowed) continue;
      seen.add(item.sha);
      commits.push({
        sha: item.sha.slice(0, 7),
        repo,
        message: String(item.commit?.message ?? "").split("\n")[0].trim(),
        date
      });
    }
  });

  commits.sort((a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0));
  return commits.slice(0, limit);
}

export async function fetchMaintainedStars(login, orgs) {
  const [owned, ...orgRepos] = await Promise.all([
    fetchOwnedRepos(login),
    ...orgs.map((org) => fetchOrgRepos(org.login))
  ]);

  const all = [...owned, ...orgRepos.flat()].filter((repo) => !repo.fork);
  const stars = all.reduce((total, repo) => total + Number(repo.stargazers_count ?? 0), 0);

  return { stars };
}

export async function fetchFeaturedRepos(fullNames) {
  const repos = await Promise.all(fullNames.map((fullName) => fetchRepo(fullName)));
  return repos.map((repo) => ({
    fullName: repo.full_name,
    description: repo.description ?? "",
    language: repo.language ?? "—",
    stars: repo.stargazers_count ?? 0
  }));
}
