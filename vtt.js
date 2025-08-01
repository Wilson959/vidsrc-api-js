// Initial empty captions array
window.availableCaptions = [];
let currentCaptionIndex = 0;
let customCues = [];
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

let currentColor = "#ffffff";
let currentFontSize = 20;
let currentBgOpacity = 0.34;
let currentPosition = 30;      // px from bottom
let currentTimingOffset = 0.0; // seconds

let langMap = {};
const lang = "en";

// Load language mapping from map.txt
function loadLangMap() {
  return fetch('/map.txt')
    .then(response => {
      if (!response.ok) throw new Error("Failed to load language map");
      return response.text();
    })
    .then(text => {
      const lines = text.split('\n');
      lines.forEach(line => {
        const [code, name] = line.trim().split('=');
        if (code && name) {
          langMap[code.trim()] = name.trim().toLowerCase();
        }
      });
    });
}

function normalize(str) {
  return str.replace(/[\s_-]+/g, '').toLowerCase();
}

function labelMatchesPreferredLanguage(label, langName) {
  const normalizedLabel = normalize(label);
  const normalizedLang = normalize(langName);
  return normalizedLabel.startsWith(normalizedLang);
}

function loadCaptions() {
  let endpointUrl = "";
  if (type === "movie") {
    endpointUrl = `https://sub.vid1.site/movie/${tmdb}`;
  } else if (type === "tv") {
    endpointUrl = `https://sub.vid1.site/tv/${tmdb}/${season}/${episode}`;
  } else {
    console.error("Unknown content type");
    return;
  }

  fetch(endpointUrl)
    .then(response => response.json())
    .then(data => {
      window.availableCaptions = data.map(item => ({
        label: item.label.toLowerCase(),
        url: item.file
      }));

      const langName = langMap[lang];
      let matchIndex = -1;

      if (langName) {
        matchIndex = window.availableCaptions.findIndex(caption =>
          labelMatchesPreferredLanguage(caption.label, langName)
        );
      }

      if (matchIndex === -1) matchIndex = 0;

      if (matchIndex > 0) {
        const matchedCaption = window.availableCaptions.splice(matchIndex, 1)[0];
        window.availableCaptions.unshift(matchedCaption);
        currentCaptionIndex = 0;
      } else {
        currentCaptionIndex = matchIndex;
      }

      if (isIOS) {
        addAllTracksForIOS(); // ← important
      }

      populateCaptionsOptions();

      if (window.availableCaptions.length > 0) {
        setCaption(currentCaptionIndex);
      } else {
        document.getElementById("current-captions").textContent = "Off";
      }
    })
    .catch(error => console.error("Error fetching captions:", error));
}

// Adds all <track> elements for iOS to make subtitles selectable natively
function addAllTracksForIOS() {
  const existingTracks = video.querySelectorAll("track");
  existingTracks.forEach(track => track.remove());

  availableCaptions.forEach((track, idx) => {
    const el = document.createElement("track");
    el.kind = "subtitles";
    el.label = track.label;
    el.srclang = lang;
    el.src = track.url;
    el.default = (idx === currentCaptionIndex); // only current is default
    video.appendChild(el);
  });
}

function populateCaptionsOptions() {
  captionsOptions.innerHTML = "";
  createCaptionItem("Off", -1, currentCaptionIndex === -1);

  availableCaptions.forEach((track, idx) => {
    createCaptionItem(track.label, idx, currentCaptionIndex === idx);
  });
}

function createCaptionItem(label, index, isActive) {
  const row = document.createElement("div");
  row.className = "settings-menu-item";

  if (isActive) row.classList.add("active");
  const iconHTML = isActive
    ? '<i class="fa-solid fa-circle-dot radio-icon"></i>'
    : '<i class="fa-regular fa-circle radio-icon"></i>';

  row.innerHTML = iconHTML + `<span>${label}</span>`;

  row.addEventListener("click", (ev) => {
    ev.stopPropagation();
    setCaption(index);
    settingsMenuCaptions.classList.add("hidden");
    settingsMenu.classList.remove("hidden");
  });

  captionsOptions.appendChild(row);
}

function setCaption(index) {
  currentCaptionIndex = index;

  if (index === -1) {
    customCues = [];
    captionContainer.innerHTML = "";

    if (isIOS) {
      const tracks = video.querySelectorAll("track");
      tracks.forEach(track => track.default = false);
    }

    document.getElementById("current-captions").textContent = "Off";
    return;
  }

  const track = availableCaptions[index];

  if (isIOS) {
    const tracks = video.querySelectorAll("track");
    tracks.forEach((t, i) => {
      t.default = (i === index);
    });

  } else {
    fetch(track.url)
      .then(response => response.text())
      .then(vttText => {
        const parser = new WebVTT.Parser(window, WebVTT.StringDecoder());
        const cues = [];

        parser.oncue = function(cue) {
          cues.push(cue);
        };

        parser.onparsingerror = function(error) {
          console.error("VTT parsing error:", error);
        };

        parser.onflush = function() {
          customCues = cues;
        };

        parser.parse(vttText);
        parser.flush();
      })
      .catch(error => console.error("Error fetching VTT file:", error));
  }

  document.getElementById("current-captions").textContent = track.label;
}

video.addEventListener("timeupdate", () => {
  if (isIOS) return;

  captionContainer.innerHTML = "";
  const effectiveTime = video.currentTime - currentTimingOffset;

  customCues.forEach(cue => {
    if (effectiveTime >= cue.startTime && effectiveTime <= cue.endTime) {
      const cueElement = document.createElement("div");
      cueElement.className = "custom-cue";
      cueElement.textContent = cue.text;

      cueElement.style.color = currentColor;
      cueElement.style.fontSize = `${currentFontSize}px`;
      cueElement.style.backgroundColor = `rgba(0,0,0,${currentBgOpacity})`;

      captionContainer.appendChild(cueElement);
    }
  });
});

loadLangMap()
  .then(() => loadCaptions())
  .catch(err => console.error("Error loading language map:", err));
