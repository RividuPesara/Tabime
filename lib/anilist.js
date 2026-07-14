const ANILIST_ENDPOINT = "https://graphql.anilist.co";

const SEARCH_QUERY = `
query ($search: String) {
  Media(search: $search, type: ANIME) {
    id
    title {
      romaji
      english
    }
    coverImage {
      medium
    }
    episodes
    siteUrl
  }
}
`;

const VIEWER_QUERY = `
query {
  Viewer {
    id
    name
  }
}
`;

const MEDIA_LIST_QUERY = `
query ($userId: Int) {
  Page {
    mediaList(userId: $userId, type: ANIME, sort: UPDATED_TIME_DESC) {
      id
      progress
      media {
        id
        title {
          romaji
          english
        }
        coverImage {
          medium
        }
        episodes
        siteUrl
      }
    }
  }
}
`;

const SAVE_MEDIA_LIST_ENTRY_MUTATION = `
mutation ($mediaId: Int, $progress: Int) {
  SaveMediaListEntry(mediaId: $mediaId, status: CURRENT, progress: $progress) {
    id
    progress
    media {
      id
      title {
        romaji
        english
      }
      coverImage {
        medium
      }
      episodes
      siteUrl
    }
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

async function searchAnime(query) {
  if (!query) return null;
  const data = await graphqlRequest(SEARCH_QUERY, { search: query });
  return data && data.Media ? data.Media : null;
}

async function getViewer(token) {
  const data = await graphqlRequest(VIEWER_QUERY, {}, token);
  return data && data.Viewer ? data.Viewer : null;
}

async function getList(session) {
  const data = await graphqlRequest(
    MEDIA_LIST_QUERY,
    { userId: session.viewer.id },
    session.token
  );
  const entries = (data && data.Page && data.Page.mediaList) || [];

  return entries.map((entry) => ({
    entryId: entry.id,
    mediaId: entry.media.id,
    title: entry.media.title.english || entry.media.title.romaji,
    cover: entry.media.coverImage.medium,
    totalEpisodes: entry.media.episodes,
    siteUrl: entry.media.siteUrl,
    lastEpisode: entry.progress,
  }));
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

async function removeAnime(session, entryId) {
  await graphqlRequest(
    DELETE_MEDIA_LIST_ENTRY_MUTATION,
    { id: entryId },
    session.token
  );
  return getList(session);
}

if (typeof module !== "undefined") {
  module.exports = {
    searchAnime,
    getViewer,
    getList,
    saveAnime,
    removeAnime,
  };
}
