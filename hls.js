// HLS & QUALITY
let hls;
window.currentQualityIndex = -1; // Will be set to 0 after fetching sources
let isBuffering = false;

// Unique token for each load attempt
window._loadToken = null;

// Define autoplay setting and video/mute UI elements
window.videoSource = "";
let autoplayEnabled = true;
video.muted = autoplayEnabled;

// Global variables for sources and playback
window.sourceEntries = []; // Array to store source details
window.sourcePlaying = false; // Flag indicating if the current source is playing
window.lastPlaybackTime = 0; // Store the last known playback position during source switches

function updateUIBasedOnAutoplay() {
  playPause.innerHTML = autoplayEnabled
    ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5h-4z"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  centerPlay.innerHTML = autoplayEnabled
    ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5h-4z"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  muteUnmute.innerHTML = video.muted
    ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M301.1 34.8C312.6 40 320 51.4 320 64l0 384c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352 64 352c-35.3 0-64-28.7-64-64l0-64c0-35.3 28.7-64 64-64l67.8 0L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3zM425 167l55 55 55-55c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-55 55 55 55c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-55-55-55 55c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l55-55-55-55c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0z"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path d="M533.6 32.5C598.5 85.2 640 165.8 640 256s-41.5 170.7-106.4 223.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C557.5 398.2 592 331.2 592 256s-34.5-142.2-88.7-186.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM473.1 107c43.2 35.2 70.9 88.9 70.9 149s-27.7 113.8-70.9 149c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C475.3 341.3 496 301.1 496 256s-20.7-85.3-53.2-111.8c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zm-60.5 74.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM301.1 34.8C312.6 40 320 51.4 320 64l0 384c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352 64 352c-35.3 0-64-28.7-64-64l0-64c0-35.3 28.7-64 64-64l67.8 0L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3z"/></svg>';
}

function tryNextSource(sources, token) {
  if (token !== window._loadToken) return;
  const nextIndex = window.currentQualityIndex + 1;
  if (nextIndex < sources.length) {
    console.warn(`[AutoFallback] Trying next source: ${nextIndex}`);
    window.lastPlaybackTime = video.currentTime;
    window.currentQualityIndex = nextIndex;
    loadSource(sources[nextIndex], sources);
  } else {
    console.error("[AutoFallback] No more sources available.");
    if (type === "tv") {
      window.location.href = `https://madplay.site/api/playsrc?id=${tmdb}/${season}/${episode}`;
    } else {
      window.location.href = `https://madplay.site/api/playsrc?id=${tmdb}`;
    }
  }
}

function digitToLetterMap(digit) {
  const map = ['a','b','c','d','e','f','g','h','i','j'];
  return map[parseInt(digit)];
}

function encodeTmdbId(tmdb, type, season, episode) {
  let raw;
  if (type === "tv") {
    raw = `${tmdb}-${season}-${episode}`;
  } else {
    raw = tmdb.split('').map(digitToLetterMap).join('');
  }
  const reversed = raw.split('').reverse().join('');
  return btoa(btoa(reversed));
}

let encodedId, endpoint;
if (type === "tv") {
  encodedId = encodeTmdbId(tmdb, type, season, episode);
  endpoint = 'tv';
} else {
  encodedId = encodeTmdbId(tmdb, type);
  endpoint = 'movie';
}

fetch(`https://madplay.site/api/playsrc?id=${endpoint}/${encodedId}`)
  .then(res => res.json())
  .then(data => {
    const sources = [];
    window.sourceEntries = [];
    for (let i = 1; data["source"+i]; i++) {
      const e = data["source"+i];
      if (e?.url) {
        sources.push(e.url);
        window.sourceEntries.push({
          name: `Source ${i}`,
          url: e.url,
          language: e.language || "Original audio",
          flag: e.flag || "default"
        });
      }
    }
    if (!sources.length) {
      if (type === "tv") {
        window.location.href = `https://player.vid1.site/tv/${tmdb}/${season}/${episode}`;
      } else {
        window.location.href = `https://player.vid1.site/movie/${tmdb}`;
      }
      return;
    }
    window.currentQualityIndex = 0;
    loadSource(sources[0], sources);
  })
  .catch(err => {
    console.error("Failed to fetch stream sources:", err);
    if (type === "tv") {
      window.location.href = `https://player.vid1.site/tv/${tmdb}/${season}/${episode}`;
    } else {
      window.location.href = `https://player.vid1.site/movie/${tmdb}`;
    }
  });
// Function to load a source
function loadSource(url, sources) {
  // bump token so old callbacks won't fire
  const loadToken = window._loadToken = Symbol();

  console.log(`[loadSource] Loading source: ${url}`);
  if (hls) { hls.destroy(); hls = null; }

  window.videoSource = url;
  window.sourcePlaying = false;
  const lowerSrc = url.toLowerCase();

  function playVideo() {
    video.addEventListener("loadedmetadata", () => {
      if (window.lastPlaybackTime > 0) {
        video.currentTime = window.lastPlaybackTime;
        console.log(`[loadSource] Restored time: ${window.lastPlaybackTime}`);
      }
    }, { once: true });

    if (autoplayEnabled) {
      video.play()
        .then(() => {
          window.sourcePlaying = true;
          updateUIBasedOnAutoplay();
          console.log("Video playing!");
        })
        .catch(err => {
          if (err.name !== 'NotAllowedError') {
            console.error("Playback error:", err);
            tryNextSource(sources, loadToken);
          }
        });
    }
  }

  video.onerror = null; // clear old handler

  if (lowerSrc.includes(".m3u8") || (!lowerSrc.includes(".mp4") && video.canPlayType("application/vnd.apple.mpegurl"))) {
    if (Hls.isSupported()) {
      hls = new Hls({ enableCEA708Captions: false });
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, playVideo);
      hls.on(Hls.Events.ERROR, (ev, data) => {
        if (data.fatal) {
          console.error("HLS fatal error:", data);
          hls.destroy();
          tryNextSource(sources, loadToken);
        }
      });
    } else {
      video.src = url;
      video.onerror = () => {
        console.error("Native HLS error.");
        tryNextSource(sources, loadToken);
      };
      playVideo();
    }
  } else {
    // MP4 or other fallback
    video.src = url;
    video.onerror = () => {
      console.error("Video error.");
      tryNextSource(sources, loadToken);
    };
    playVideo();
  }
}

// Manual reselect bumps the token too
window.reselectSource = function(idx, sources) {
  console.log(`[reselectSource] Selecting ${idx}`);
  if (window.currentQualityIndex === idx) return;
  window.lastPlaybackTime = video.currentTime;
  window.currentQualityIndex = idx;
  loadSource(sources[idx], sources);
};

// Playback position storage
function getPlaybackKey() {
  return (type === "tv") ? `${tmdb}-${season}-${episode}` : `${tmdb}`;
}
function savePlaybackPosition() {
  const key = getPlaybackKey();
  const t = video.currentTime;
  localStorage.setItem(key, t);
  window.lastPlaybackTime = t;
  console.log(`[savePosition] ${t} for ${key}`);
}
function loadPlaybackPosition() {
  const key = getPlaybackKey();
  const val = localStorage.getItem(key);
  if (val != null) {
    window.lastPlaybackTime = parseFloat(val);
    video.currentTime = window.lastPlaybackTime;
    console.log(`[loadPosition] ${window.lastPlaybackTime} for ${key}`);
  }
}
setInterval(savePlaybackPosition, 10000);
loadPlaybackPosition();

// Media Session artwork
if ('mediaSession' in navigator) {
  navigator.mediaSession.metadata = new MediaMetadata({
    artwork: [{ src: cover, type: 'image/jpeg' }]
  });
}
