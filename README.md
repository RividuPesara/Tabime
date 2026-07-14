# Anime Tracker

A Firefox extension that saves the anime you are watching straight to your AniList account.

## How it works

1. Click the toolbar icon while on an anime page
2. The extension reads the tab title and cleans it up
3. It searches AniList for a matching anime
4. You confirm the match and save it
5. The show is added to your AniList "Watching" list with the parsed episode as progress

## Setup

1. Go to `anilist.co/settings/developer` and create an app to get a client id
2. Paste the client id into `lib/config.js`
3. Load the extension in Firefox at `about:debugging` then `This Firefox` then `Load Temporary Add-on` and pick `manifest.json`
4. Open the popup, right click inside it, choose Inspect, then run `browser.identity.getRedirectURL()` in the console
5. Paste that redirect url into the Redirect URL field on your AniList app settings and save
6. Reload the extension and click Log in with AniList


