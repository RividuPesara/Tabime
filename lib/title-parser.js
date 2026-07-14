const SITE_SUFFIXES = [
  /\s*[-|]\s*Crunchyroll\s*$/i,
  /\s*[-|]\s*HIDIVE\s*$/i,
  /\s*[-|]\s*Funimation\s*$/i,
  /\s*[-|]\s*Netflix\s*$/i,
  /\s*[-|]\s*Watch on Crunchyroll\s*$/i,
  /\s*[-|]\s*9anime.*$/i,
  /\s*[-|]\s*AnimixPlay.*$/i,
  /\s*[-|]\s*Gogoanime.*$/i,
  /\s*[-|]\s*Zoro.*$/i,
  /\s*-\s*on\s*-\s*[^-|]+$/i,
  /\s*[-|]\s*HiAnime.*$/i,
];

const LEADING_JUNK = [/^Watch\s+/i];

const EPISODE_PATTERNS = [
  /episode\s*(\d+)/i,
  /\bep\.?\s*(\d+)\b/i,
  /\bE(\d{1,4})\b/,
  /-\s*(\d{1,4})\s*$/,
];

function parseEpisode(rawTitle) {
  for (const pattern of EPISODE_PATTERNS) {
    const match = rawTitle.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!Number.isNaN(num)) return num;
    }
  }
  return null;
}

function cleanTitle(rawTitle) {
  let title = rawTitle.trim();

  for (const suffix of SITE_SUFFIXES) {
    title = title.replace(suffix, "");
  }
  for (const prefix of LEADING_JUNK) {
    title = title.replace(prefix, "");
  }

  title = title
    .replace(/episode\s*\d+.*$/i, "")
    .replace(/\bep\.?\s*\d+.*$/i, "")
    .replace(/\bE\d{1,4}\b.*$/, "")
    .replace(/-\s*\d{1,4}\s*$/, "");

  title = title.replace(/[\s\-|:]+$/, "").trim();

  return title;
}

function parseTabTitle(rawTitle) {
  return {
    query: cleanTitle(rawTitle),
    episode: parseEpisode(rawTitle),
  };
}

if (typeof module !== "undefined") {
  module.exports = { cleanTitle, parseEpisode, parseTabTitle };
}
