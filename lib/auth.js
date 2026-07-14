const SESSION_KEY = "session";

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

async function login() {
  const redirectUrl = await browser.identity.launchWebAuthFlow({
    url: buildAuthorizeUrl(),
    interactive: true,
  });

  const { token, expiresAt } = parseTokenFromRedirect(redirectUrl);
  const viewer = await getViewer(token);

  const session = { token, expiresAt, viewer };
  await browser.storage.local.set({ [SESSION_KEY]: session });
  return session;
}

async function logout() {
  await browser.storage.local.remove(SESSION_KEY);
}

// expired token is considered loggd out 
async function getSession() {
  const { [SESSION_KEY]: session } = await browser.storage.local.get(SESSION_KEY);
  if (!session) return null;
  if (Date.now() >= session.expiresAt) {
    await logout();
    return null;
  }
  return session;
}

if (typeof module !== "undefined") {
  module.exports = { login, logout, getSession };
}
