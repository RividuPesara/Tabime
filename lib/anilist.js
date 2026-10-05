const ANILIST_ENDPOINT = "https://graphql.anilist.co";

const MEDIA_FIELDS = `
  id
  title {
    romaji
    english
  }
  coverImage {
    medium
    color
  }
  episodes
  status
  siteUrl
  nextAiringEpisode {
    episode
    airingAt
    timeUntilAiring
  }
  externalLinks {
    site
    url
    type
  }
`;

const SEARCH_QUERY = `
query ($search: String) {
  Media(search: $search, type: ANIME) {
    ${MEDIA_FIELDS}
  }
}
`;

const VIEWER_QUERY = `
query {
  Viewer {
    id
    name
    mediaListOptions {
      scoreFormat
    }
  }
}
`;

const MEDIA_LIST_QUERY = `
query ($userId: Int, $perPage: Int) {
  Page(perPage: $perPage) {
    pageInfo {
      hasNextPage
    }
    mediaList(
      userId: $userId
      type: ANIME
      status_in: [CURRENT, REPEATING]
      sort: UPDATED_TIME_DESC
    ) {
      id
      progress
      score
      status
      media {
        ${MEDIA_FIELDS}
      }
    }
  }
}
`;

const SAVE_MEDIA_LIST_ENTRY_MUTATION = `
mutation ($mediaId: Int, $progress: Int) {
  SaveMediaListEntry(mediaId: $mediaId, status: CURRENT, progress: $progress) {
    id
  }
}
`;

// updates an entry that already exists, addressed by entry id so we only
// touch the fields we pass
const UPDATE_MEDIA_LIST_ENTRY_MUTATION = `
mutation ($id: Int, $progress: Int, $status: MediaListStatus, $score: Float) {
  SaveMediaListEntry(id: $id, progress: $progress, status: $status, score: $score) {
    id
    progress
    score
    status
  }
}
`;

const DELETE_MEDIA_LIST_ENTRY_MUTATION = `
mutation ($id: Int) {
  DeleteMediaListEntry(id: $id) {
    deleted
  }
}
`;

async function graphqlRequest(query, variables, token) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`AniList request failed: ${response.status}`);
  }

  const { data, errors } = await response.json();
  if (errors && errors.length) {
    const notFound = errors.some((e) => e.status === 404);
    if (notFound) return null;
    throw new Error(errors[0].message || "AniList query error");
  }

  return data;
}

function streamingLinks(media) {
  return (media.externalLinks || [])
    .filter((link) => link.type === "STREAMING")
    .map((link) => ({ site: link.site, url: link.url }));
}

function mapEntry(entry) {
  const media = entry.media;
  const airing = media.nextAiringEpisode;

  return {
    entryId: entry.id,
    mediaId: media.id,
    title: media.title.english || media.title.romaji,
    cover: media.coverImage.medium,
    color: media.coverImage.color,
    totalEpisodes: media.episodes,
    siteUrl: media.siteUrl,
    lastEpisode: entry.progress,
    score: entry.score,
    status: entry.status,
    airingStatus: media.status,
    nextEpisode: airing ? airing.episode : null,
    timeUntilAiring: airing ? airing.timeUntilAiring : null,
    streaming: streamingLinks(media),
  };
}

async function searchAnime(query) {
  if (!query) return null;
  const data = await graphqlRequest(SEARCH_QUERY, { search: query });
  const media = data && data.Media;
  if (!media) return null;
  return {
    id: media.id,
    title: media.title.english || media.title.romaji,
    cover: media.coverImage.medium,
  };
}

async function getViewer(token) {
  const data = await graphqlRequest(VIEWER_QUERY, {}, token);
  return data && data.Viewer ? data.Viewer : null;
}

async function getList(session) {
  const data = await graphqlRequest(
    MEDIA_LIST_QUERY,
    { userId: session.viewer.id, perPage: 50 },
    session.token
  );
  const entries = (data && data.Page && data.Page.mediaList) || [];

  return entries.map(mapEntry);
}

// always saves as watching status for now
async function saveAnime(session, media, episode) {
  await graphqlRequest(
    SAVE_MEDIA_LIST_ENTRY_MUTATION,
    { mediaId: media.id, progress: episode ?? undefined },
    session.token
  );
  return getList(session);
}

// only the fields present in `changes` are sent, so this can bump progress
async function updateEntry(session, entryId, changes) {
  await graphqlRequest(
    UPDATE_MEDIA_LIST_ENTRY_MUTATION,
    {
      id: entryId,
      progress: changes.progress,
      status: changes.status,
      score: changes.score,
    },
    session.token
  );
  return getList(session);
}

async function removeAnime(session, entryId) {
  await graphqlRequest(
    DELETE_MEDIA_LIST_ENTRY_MUTATION,
    { id: entryId },
    session.token
  );
  return getList(session);
}

const AniList = {
  name: "AniList",
  searchAnime,
  getViewer,
  getList,
  saveAnime,
  updateEntry,
  removeAnime,
};

if (typeof module !== "undefined") {
  module.exports = {
    AniList,
    searchAnime,
    getViewer,
    getList,
    saveAnime,
    updateEntry,
    removeAnime,
  };
}
