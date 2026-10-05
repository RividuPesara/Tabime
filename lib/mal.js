const MAL_API = "https://api.myanimelist.net/v2";

const MAL_LIST_FIELDS =
  "list_status,num_episodes,status,main_picture,alternative_titles";

const MAL_TO_STATUS = {
  watching: "CURRENT",
  completed: "COMPLETED",
  on_hold: "PAUSED",
  dropped: "DROPPED",
  plan_to_watch: "PLANNING",
};

const STATUS_TO_MAL = {
  CURRENT: "watching",
  REPEATING: "watching",
  COMPLETED: "completed",
  PAUSED: "on_hold",
  DROPPED: "dropped",
  PLANNING: "plan_to_watch",
};

async function malRequest(path, token, options = {}) {
  const response = await fetch(`${MAL_API}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`MyAnimeList request failed: ${response.status}`);
  }
  // delete answers with an empty body
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function malTitle(node) {
  const alt = node.alternative_titles;
  return (alt && alt.en) || node.title;
}

function malMapEntry({ node, list_status: listStatus }) {
  return {
    entryId: node.id,
    mediaId: node.id,
    title: malTitle(node),
    cover: node.main_picture ? node.main_picture.medium : "",
    color: null,
    totalEpisodes: node.num_episodes || null,
    siteUrl: `https://myanimelist.net/anime/${node.id}`,
    lastEpisode: listStatus.num_episodes_watched,
    score: listStatus.score,
    status: listStatus.is_rewatching
      ? "REPEATING"
      : MAL_TO_STATUS[listStatus.status],
    airingStatus: node.status === "finished_airing" ? "FINISHED" : null,
    nextEpisode: null,
    timeUntilAiring: null,
    streaming: [],
  };
}

async function malSearchAnime(query, session) {
  if (!query) return null;
  const params = new URLSearchParams({
    q: query.slice(0, 64),
    limit: "1",
    fields: "main_picture,alternative_titles",
  });
  const data = await malRequest(`/anime?${params}`, session.token);
  const node = data && data.data[0] && data.data[0].node;
  if (!node) return null;

  return {
    id: node.id,
    title: malTitle(node),
    cover: node.main_picture ? node.main_picture.medium : "",
  };
}

async function malGetViewer(token) {
  const user = await malRequest("/users/@me", token);
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    mediaListOptions: { scoreFormat: "POINT_10" },
  };
}

async function malGetList(session) {
  const params = new URLSearchParams({
    status: "watching",
    sort: "list_updated_at",
    limit: "100",
    fields: MAL_LIST_FIELDS,
  });
  const data = await malRequest(`/users/@me/animelist?${params}`, session.token);
  return ((data && data.data) || []).map(malMapEntry);
}

async function malPatchStatus(session, animeId, fields) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) body.set(key, String(value));
  }
  await malRequest(`/anime/${animeId}/my_list_status`, session.token, {
    method: "PATCH",
    body,
  });
}

async function malSaveAnime(session, media, episode) {
  await malPatchStatus(session, media.id, {
    status: "watching",
    num_watched_episodes: episode,
  });
  return malGetList(session);
}

async function malUpdateEntry(session, entryId, changes) {
  const fields = {
    num_watched_episodes: changes.progress,
    score: changes.score,
  };
  if (changes.status) {
    fields.status = STATUS_TO_MAL[changes.status];
    fields.is_rewatching = changes.status === "REPEATING";
  }
  await malPatchStatus(session, entryId, fields);
  return malGetList(session);
}

async function malRemoveAnime(session, entryId) {
  await malRequest(`/anime/${entryId}/my_list_status`, session.token, {
    method: "DELETE",
  });
  return malGetList(session);
}

const MyAnimeList = {
  name: "MyAnimeList",
  searchAnime: malSearchAnime,
  getViewer: malGetViewer,
  getList: malGetList,
  saveAnime: malSaveAnime,
  updateEntry: malUpdateEntry,
  removeAnime: malRemoveAnime,
};

if (typeof module !== "undefined") {
  module.exports = { MyAnimeList };
}
