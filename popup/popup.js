const accountArea = document.getElementById("account-area");
const loginSection = document.getElementById("login-section");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");
const appEl = document.getElementById("app");
const matchSection = document.getElementById("match-section");
const matchCard = document.getElementById("match-card");
const matchStatus = document.getElementById("match-status");
const listEl = document.getElementById("anime-list");
const emptyState = document.getElementById("empty-state");
const filterInput = document.getElementById("filter-input");
const listCount = document.getElementById("list-count");
const toastEl = document.getElementById("toast");

const STATUS_LABELS = {
  CURRENT: "Watching",
  REPEATING: "Rewatching",
  COMPLETED: "Completed",
  PAUSED: "Paused",
  DROPPED: "Dropped",
  PLANNING: "Planning",
};

let currentSession = null;
let currentList = [];
const expanded = new Set();
let toastTimer = null;

function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 2600);
}

function formatCountdown(seconds) {
  if (seconds == null) return "";
  if (seconds <= 0) return "airing now";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days) return `in ${days}d ${hours}h`;
  if (hours) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
}

// how many aired episodes the user has not watched yet
function episodesBehind(item) {
  const progress = item.lastEpisode || 0;
  const aired = item.nextEpisode
    ? item.nextEpisode - 1
    : item.airingStatus === "FINISHED"
      ? item.totalEpisodes
      : null;

  if (aired == null) return 0;
  return Math.max(0, aired - progress);
}

function scoreOptions(format) {
  switch (format) {
    case "POINT_100":
      return Array.from({ length: 101 }, (_, i) => [i, String(i)]);
    case "POINT_10_DECIMAL":
      return Array.from({ length: 21 }, (_, i) => [i / 2, (i / 2).toFixed(1)]);
    case "POINT_5":
      return Array.from({ length: 6 }, (_, i) => [i, "★".repeat(i) || "–"]);
    case "POINT_3":
      return [
        [0, "–"],
        [1, "🙁"],
        [2, "😐"],
        [3, "🙂"],
      ];
    case "POINT_10":
    default:
      return Array.from({ length: 11 }, (_, i) => [i, String(i)]);
  }
}

function viewerScoreFormat() {
  const options = currentSession && currentSession.viewer.mediaListOptions;
  return (options && options.scoreFormat) || "POINT_10";
}

// keeps rows from jumping around after a mutation refetches the list
function preserveOrder(previous, next) {
  if (!previous.length) return next;
  const position = new Map(previous.map((item, i) => [item.entryId, i]));
  return [...next].sort(
    (a, b) =>
      (position.has(a.entryId) ? position.get(a.entryId) : -1) -
      (position.has(b.entryId) ? position.get(b.entryId) : -1)
  );
}

function setList(list) {
  currentList = preserveOrder(currentList, list);
  const alive = new Set(currentList.map((item) => item.entryId));
  for (const id of expanded) {
    if (!alive.has(id)) expanded.delete(id);
  }
  renderList();
}

async function applyChange(item, changes, message) {
  const scrollTop = listEl.scrollTop;
  try {
    const updated = await updateEntry(currentSession, item.entryId, changes);
    setList(updated);
    listEl.scrollTop = scrollTop;
    if (message) showToast(message);
  } catch (err) {
    showToast("Update failed");
    renderList();
  }
}

function renderAccountArea(session) {
  accountArea.innerHTML = "";
  if (!session) return;

  const name = document.createElement("span");
  name.textContent = session.viewer.name;

  const logoutBtn = document.createElement("button");
  logoutBtn.className = "logout-btn";
  logoutBtn.textContent = "Log out";
  logoutBtn.addEventListener("click", async () => {
    await logout();
    location.reload();
  });

  accountArea.appendChild(name);
  accountArea.appendChild(logoutBtn);
}

function buildDetail(item) {
  const detail = document.createElement("div");
  detail.className = "anime-detail";

  const controls = document.createElement("div");
  controls.className = "detail-controls";

  const statusField = document.createElement("label");
  statusField.className = "detail-field";
  statusField.textContent = "Status";

  const statusSelect = document.createElement("select");
  statusSelect.className = "detail-select";
  for (const [value, label] of Object.entries(STATUS_LABELS)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    statusSelect.appendChild(option);
  }
  statusSelect.value = item.status || "CURRENT";
  statusSelect.addEventListener("change", () => {
    applyChange(
      item,
      { status: statusSelect.value },
      `${item.title} → ${STATUS_LABELS[statusSelect.value]}`
    );
  });
  statusField.appendChild(statusSelect);

  const scoreField = document.createElement("label");
  scoreField.className = "detail-field";
  scoreField.textContent = "Score";

  const scoreSelect = document.createElement("select");
  scoreSelect.className = "detail-select";
  for (const [value, label] of scoreOptions(viewerScoreFormat())) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = value === 0 ? "–" : label;
    scoreSelect.appendChild(option);
  }
  scoreSelect.value = String(item.score || 0);
  scoreSelect.addEventListener("change", () => {
    const score = Number(scoreSelect.value);
    applyChange(
      item,
      { score },
      score ? `Scored ${scoreSelect.selectedOptions[0].textContent}` : "Score cleared"
    );
  });
  scoreField.appendChild(scoreSelect);

  controls.appendChild(statusField);
  controls.appendChild(scoreField);
  detail.appendChild(controls);

  if (item.streaming.length) {
    const links = document.createElement("div");
    links.className = "detail-links";

    for (const link of item.streaming) {
      const anchor = document.createElement("a");
      anchor.className = "stream-link";
      anchor.href = link.url;
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      anchor.textContent = link.site;
      links.appendChild(anchor);
    }

    detail.appendChild(links);
  }

  if (item.siteUrl) {
    const anilistLink = document.createElement("a");
    anilistLink.className = "detail-anilist";
    anilistLink.href = item.siteUrl;
    anilistLink.target = "_blank";
    anilistLink.rel = "noreferrer";
    anilistLink.textContent = "View on AniList";
    detail.appendChild(anilistLink);
  }

  return detail;
}

function buildRow(item) {
  const li = document.createElement("li");
  li.className = "anime-item";
  if (item.color) li.style.setProperty("--accent", item.color);

  const row = document.createElement("div");
  row.className = "anime-row";

  const img = document.createElement("img");
  img.src = item.cover;
  img.alt = "";

  const info = document.createElement("button");
  info.className = "anime-item-info";
  info.setAttribute("aria-expanded", String(expanded.has(item.entryId)));

  const title = document.createElement("div");
  title.className = "anime-item-title";
  title.textContent = item.title;

  const episode = document.createElement("div");
  episode.className = "anime-item-episode";
  episode.textContent = item.lastEpisode
    ? `Ep ${item.lastEpisode}${item.totalEpisodes ? ` / ${item.totalEpisodes}` : ""}`
    : item.totalEpisodes
      ? `${item.totalEpisodes} episodes`
      : "";

  info.appendChild(title);
  info.appendChild(episode);

  const behind = episodesBehind(item);
  const countdown = formatCountdown(item.timeUntilAiring);

  if (behind || countdown) {
    const airing = document.createElement("div");
    airing.className = "anime-item-airing";

    if (behind) {
      const badge = document.createElement("span");
      badge.className = "behind-badge";
      badge.textContent = `${behind} behind`;
      airing.appendChild(badge);
    }

    if (countdown) {
      const next = document.createElement("span");
      next.textContent = `Ep ${item.nextEpisode} ${countdown}`;
      airing.appendChild(next);
    }

    info.appendChild(airing);
  }

  info.addEventListener("click", () => {
    if (expanded.has(item.entryId)) expanded.delete(item.entryId);
    else expanded.add(item.entryId);
    renderList();
  });

  const actions = document.createElement("div");
  actions.className = "anime-actions";

  const plusBtn = document.createElement("button");
  plusBtn.className = "plus-btn";
  plusBtn.textContent = "+1";
  const atEnd =
    item.totalEpisodes && (item.lastEpisode || 0) >= item.totalEpisodes;
  plusBtn.disabled = Boolean(atEnd);
  plusBtn.title = atEnd ? "All episodes watched" : "Watched one more episode";
  plusBtn.addEventListener("click", async () => {
    plusBtn.disabled = true;
    const next = (item.lastEpisode || 0) + 1;
    const finishing = item.totalEpisodes && next >= item.totalEpisodes;

    await applyChange(
      item,
      finishing ? { progress: next, status: "COMPLETED" } : { progress: next },
      finishing ? `${item.title} completed 🎉` : `${item.title} → Ep ${next}`
    );
  });

  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-btn";
  removeBtn.textContent = "×";
  removeBtn.title = "Remove";
  removeBtn.addEventListener("click", async () => {
    const scrollTop = listEl.scrollTop;
    try {
      const updated = await removeAnime(currentSession, item.entryId);
      setList(updated);
      listEl.scrollTop = scrollTop;
    } catch (err) {
      showToast("Remove failed");
    }
  });

  actions.appendChild(plusBtn);
  actions.appendChild(removeBtn);

  row.appendChild(img);
  row.appendChild(info);
  row.appendChild(actions);
  li.appendChild(row);

  if (expanded.has(item.entryId)) li.appendChild(buildDetail(item));

  return li;
}

function renderList() {
  const query = filterInput.value.trim().toLowerCase();
  const list = query
    ? currentList.filter((item) => item.title.toLowerCase().includes(query))
    : currentList;

  listEl.innerHTML = "";
  filterInput.hidden = currentList.length === 0;

  listCount.textContent = query
    ? `${list.length} / ${currentList.length}`
    : currentList.length
      ? `${currentList.length}`
      : "";

  emptyState.hidden = list.length > 0;
  emptyState.textContent = currentList.length
    ? "No titles match that filter."
    : "Nothing saved yet.";

  for (const item of list) {
    listEl.appendChild(buildRow(item));
  }
}

function renderMatchCard(session, media, episode) {
  matchSection.hidden = false;
  matchCard.innerHTML = "";

  const img = document.createElement("img");
  img.src = media.coverImage.medium;
  img.alt = "";

  const info = document.createElement("div");
  info.className = "match-info";

  const title = document.createElement("div");
  title.className = "match-title";
  title.textContent = media.title.english || media.title.romaji;

  const episodeLine = document.createElement("div");
  episodeLine.className = "match-episode";
  episodeLine.textContent = episode ? `Episode ${episode}` : "Episode unknown";

  info.appendChild(title);
  info.appendChild(episodeLine);

  const saveBtn = document.createElement("button");
  saveBtn.className = "save-btn";
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saved";
    const updated = await saveAnime(session, media, episode);
    setList(updated);
  });

  matchCard.appendChild(img);
  matchCard.appendChild(info);
  matchCard.appendChild(saveBtn);
}

async function ensureScoreFormat(session) {
  if (session.viewer.mediaListOptions) return session;

  try {
    const viewer = await getViewer(session.token);
    if (viewer) {
      session.viewer = viewer;
      await saveSession(session);
    }
  } catch (err) {
  }
  return session;
}

async function loadForSession(session) {
  renderAccountArea(session);
  setList(await getList(session));

  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab || !tab.title) return;

  const { query, episode } = parseTabTitle(tab.title);
  if (!query) return;

  matchStatus.textContent = "Looking up on AniList…";

  try {
    const media = await searchAnime(query);
    matchStatus.textContent = "";

    if (!media) {
      matchStatus.textContent = "No AniList match for this tab.";
      return;
    }

    renderMatchCard(session, media, episode);
  } catch (err) {
    matchStatus.textContent = "AniList lookup failed.";
  }
}

filterInput.addEventListener("input", () => {
  renderList();
  listEl.scrollTop = 0;
});

filterInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && filterInput.value) {
    e.stopPropagation();
    filterInput.value = "";
    renderList();
  }
});

loginBtn.addEventListener("click", async () => {
  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in…";
  try {
    await browser.runtime.sendMessage({ type: "login" });
    location.reload();
  } catch (err) {
    loginBtn.disabled = false;
    loginBtn.textContent = "Log in with AniList";
    loginError.textContent = `Login failed: ${err.message}`;
    loginError.hidden = false;
  }
});

async function init() {
  const session = await getSession();

  if (!session) {
    loginSection.hidden = false;
    appEl.hidden = true;
    return;
  }

  loginSection.hidden = true;
  appEl.hidden = false;
  currentSession = await ensureScoreFormat(session);
  await loadForSession(currentSession);
}

init();
