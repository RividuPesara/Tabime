# Anime Tracker

A Firefox extension that saves the anime you are watching straight to your AniList or MyAnimeList account.

## How it works

1. Log in with AniList or MyAnimeList
2. Click the toolbar icon while on an anime page
3. The extension reads the tab title and cleans it up
4. It searches the site you logged in with for a matching anime
5. You confirm the match and save it
6. The show is added to your "Watching" list with the parsed episode as progress

## In the popup

- Your currently watching list, with a filter box for long lists
- `+1` on any row to bump episode progress, which auto-completes the show on the last episode
- Airing countdown for the next episode and a badge for how many aired episodes you are behind
- Click a row to set status and score, or jump to a streaming site

Airing countdowns, the behind badge for airing shows and streaming links come from
AniList only. The MyAnimeList API does not expose them, so MyAnimeList accounts get
the list, progress, status and score but not those extras. MyAnimeList lists show
the 100 most recently updated entries.

## Supported sites

The extension works on any site. It only reads the title of the tab you are on
when you click the icon. Its only host permissions are for `myanimelist.net` and
`api.myanimelist.net`, which the MyAnimeList login and API need. These sites have dedicated
cleanup rules in `lib/title-parser.js`, so their titles resolve most reliably:

| Site | Example tab title | Parsed as |
| --- | --- | --- |
| Crunchyroll | `Watch Frieren Episode 13 - Crunchyroll` | Frieren, ep 13 |
| HIDIVE | `Frieren Episode 13 \| HIDIVE` | Frieren, ep 13 |
| Netflix | `Frieren - Netflix` | Frieren |
| HiAnime | `Watch Frieren Episode 13 - HiAnime` | Frieren, ep 13 |
| Zoro | `Frieren Episode 13 - Zoro.to` | Frieren, ep 13 |
| 9anime | `Frieren Episode 13 - 9anime` | Frieren, ep 13 |
| Gogoanime | `Frieren Episode 13 - Gogoanime` | Frieren, ep 13 |
| AnimixPlay | `Frieren Episode 13 - AnimixPlay` | Frieren, ep 13 |

Anywhere else, the generic rules still apply: a leading `Watch` is dropped, a
trailing `- <site name>` is trimmed, and the episode number is read from
`Episode 13`, `Ep. 13`, `E13` or a trailing `- 13`. If a title comes out wrong,
add a suffix pattern to `SITE_SUFFIXES` in `lib/title-parser.js`.

## Setup

1. Load the extension in Firefox at `about:debugging` then `This Firefox` then `Load Temporary Add-on` and pick `manifest.json`
2. Open the popup, right click inside it, choose Inspect, then run `browser.identity.getRedirectURL()` in the console and copy the result

### AniList

1. Go to `anilist.co/settings/developer` and create an app
2. Set its Redirect URL to the url from step 2 above
3. Paste the client id into `ANILIST_CLIENT_ID` in `lib/config.js`

### MyAnimeList

1. Go to `myanimelist.net/apiconfig` and create an app with App Type `other`
2. Set its App Redirect URL to the url from step 2 above
3. Paste the client id into `MAL_CLIENT_ID` in `lib/config.js`

MyAnimeList login uses the authorization code flow with plain PKCE, and tokens are
refreshed automatically when they expire. Client ids are not secret, so they are
safe to ship in the extension. An `other` type app has no client secret, and one
should never be put in the extension.

Reload the extension and click the login button for the site you want.


