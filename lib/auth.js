const SESSION_KEY = "session";
const MAL_TOKEN_URL = "https://myanimelist.net/v1/oauth2/token";

function providerFor(session) {
  return session && session.provider === "mal" ? MyAnimeList : AniList;
}

function buildAuthorizeUrl() {
  const params = new URLSearchParams({
    client_id: ANILIST_CLIENT_ID,
    response_type: "token",
  });
  return `https://anilist.co/api/v2/oauth/authorize?${params.toString()}`;
}

function parseTokenFromRedirect(redirectUrl) {
  const hash = new URL(redirectUrl).hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);
  const token = params.get("access_token");
  const expiresIn = parseInt(params.get("expires_in"), 10);
  if (!token) throw new Error("AniList redirect did not include an access token");
  return { token, expiresAt: Date.now() + expiresIn * 1000 };
}

async function loginAniList() {
  const redirectUrl = await browser.identity.launchWebAuthFlow({
    url: buildAuthorizeUrl(),
    interactive: true,
  });

  const { token, expiresAt } = parseTokenFromRedirect(redirectUrl);
  const viewer = await AniList.getViewer(token);
  return { provider: "anilist", token, expiresAt, viewer };
}

function randomString(bytes) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function requestMalToken(fields) {
  const response = await fetch(MAL_TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({ client_id: MAL_CLIENT_ID, ...fields }),
  });
  if (!response.ok) {
    throw new Error(`MyAnimeList token request failed: ${response.status}`);
  }
  const data = await response.json();
  return {
    token: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

async function loginMal() {
  const verifier = randomString(64);
  const state = randomString(16);
  const redirectUri = browser.identity.getRedirectURL();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: MAL_CLIENT_ID,
    code_challenge: verifier,
    code_challenge_method: "plain",
    redirect_uri: redirectUri,
    state,
  });

  const redirectUrl = await browser.identity.launchWebAuthFlow({
    url: `https://myanimelist.net/v1/oauth2/authorize?${params}`,
    interactive: true,
  });

  const result = new URL(redirectUrl).searchParams;
  if (result.get("state") !== state) {
    throw new Error("MyAnimeList login state mismatch");
  }
  const code = result.get("code");
  if (!code) throw new Error("MyAnimeList redirect did not include a code");

  const tokens = await requestMalToken({
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri,
  });
  const viewer = await MyAnimeList.getViewer(tokens.token);
  return { provider: "mal", ...tokens, viewer };
}

async function login(provider) {
  const session = provider === "mal" ? await loginMal() : await loginAniList();
  await saveSession(session);
  return session;
}

async function logout() {
  await browser.storage.local.remove(SESSION_KEY);
}

async function saveSession(session) {
  await browser.storage.local.set({ [SESSION_KEY]: session });
}

async function refreshMalSession(session) {
  try {
    const tokens = await requestMalToken({
      grant_type: "refresh_token",
      refresh_token: session.refreshToken,
    });
    const refreshed = { ...session, ...tokens };
    await saveSession(refreshed);
    return refreshed;
  } catch (err) {
    await logout();
    return null;
  }
}

// expired anilist tokens count as logged out, mal ones get refreshed
async function getSession() {
  const { [SESSION_KEY]: session } = await browser.storage.local.get(SESSION_KEY);
  if (!session) return null;
  if (Date.now() >= session.expiresAt) {
    if (session.provider === "mal" && session.refreshToken) {
      return refreshMalSession(session);
    }
    await logout();
    return null;
  }
  return session;
}

if (typeof module !== "undefined") {
  module.exports = { login, logout, getSession, saveSession, providerFor };
}
