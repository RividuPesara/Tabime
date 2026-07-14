const accountArea = document.getElementById("account-area");
const loginSection = document.getElementById("login-section");
const loginBtn = document.getElementById("login-btn");
const appEl = document.getElementById("app");
const matchSection = document.getElementById("match-section");
const matchCard = document.getElementById("match-card");
const matchStatus = document.getElementById("match-status");
const listEl = document.getElementById("anime-list");
const emptyState = document.getElementById("empty-state");

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

function renderList(list) {
  listEl.innerHTML = "";
  emptyState.hidden = list.length > 0;

  for (const item of list) {
    const li = document.createElement("li");
    li.className = "anime-item";

    const img = document.createElement("img");
    img.src = item.cover;
    img.alt = "";

    const info = document.createElement("div");
    info.className = "anime-item-info";

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

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "×";
    removeBtn.title = "Remove";
    removeBtn.addEventListener("click", async () => {
      const session = await getSession();
      const updated = await removeAnime(session, item.entryId);
      renderList(updated);
    });

    li.appendChild(img);
    li.appendChild(info);
    li.appendChild(removeBtn);
    listEl.appendChild(li);
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
    renderList(updated);
  });

  matchCard.appendChild(img);
  matchCard.appendChild(info);
  matchCard.appendChild(saveBtn);
}

async function loadForSession(session) {
  renderAccountArea(session);
  renderList(await getList(session));

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

loginBtn.addEventListener("click", async () => {
  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in…";
  try {
    await login();
    location.reload();
  } catch (err) {
    loginBtn.disabled = false;
    loginBtn.textContent = "Log in with AniList";
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
  await loadForSession(session);
}

init();
