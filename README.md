# Anime Tracker

A Firefox extension that saves the anime you are watching straight to your AniList account.

## How it works

1. Click the toolbar icon while on an anime page
2. The extension reads the tab title and cleans it up
3. It searches AniList for a matching anime
4. You confirm the match and save it
5. The show is added to your AniList "Watching" list with the parsed episode as progress

## In the popup

- Your currently watching list, with a filter box for long lists
- `+1` on any row to bump episode progress, which auto-completes the show on the last episode
- Airing countdown for the next episode and a badge for how many aired episodes you are behind
- Click a row to set status and score, or jump to a streaming site

## Supported sites

There are no site permissions, so the extension works anywhere. It only reads the
title of the tab you are on when you click the icon. These sites have dedicated
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

1. Go to `anilist.co/settings/developer` and create an app to get a client id
2. Paste the client id into `lib/config.js`
3. Load the extension in Firefox at `about:debugging` then `This Firefox` then `Load Temporary Add-on` and pick `manifest.json`
4. Open the popup, right click inside it, choose Inspect, then run `browser.identity.getRedirectURL()` in the console
5. Paste that redirect url into the Redirect URL field on your AniList app settings and save
6. Reload the extension and click Log in with AniList


