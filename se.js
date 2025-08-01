const apiKey = "54e00466a09676df57ba51c4ca30b1a6"; // TMDb API key

// Cache objects to store API responses
const seasonDetailsCache = {};
const showDetailsCache = {};

// Function to fetch season details with caching
async function getSeasonDetails(tmdb, season) {
  const cacheKey = `${tmdb}-season-${season}`;
  if (seasonDetailsCache[cacheKey]) {
    return seasonDetailsCache[cacheKey];
  }
  try {
    const response = await fetch(`https://api.themoviedb.org/3/tv/${tmdb}/season/${season}?api_key=${apiKey}`);
    const seasonData = await response.json();
    seasonDetailsCache[cacheKey] = seasonData;
    return seasonData;
  } catch (error) {
    console.error("Error fetching season details:", error);
    return null;
  }
}

// Function to fetch show details with caching (includes seasons array)
async function fetchShowDetails(tmdb) {
  if (showDetailsCache[tmdb]) {
    return showDetailsCache[tmdb];
  }
  try {
    const response = await fetch(`https://api.themoviedb.org/3/tv/${tmdb}?api_key=${apiKey}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch show details: HTTP ${response.status}`);
    }
    const data = await response.json();
    const today = new Date();
    // Filter seasons that have an air_date in the past
    data.seasons = data.seasons.filter(season => {
      return season.season_number >= 1 &&
             season.air_date &&
             new Date(season.air_date) <= today;
    });
    showDetailsCache[tmdb] = data;
    return data;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

// ------------------- Next Episode Logic -------------------
if (type === "tv") {
  let nextEpisodeClosed = false;
  let nextEpisodeUrl = null;
  let nextEpisodeText = "Next Episode";

  const nextEpisodeContainer = document.createElement('div');
  Object.assign(nextEpisodeContainer.style, {
    position: "absolute",
    right: "20px",
    top: "50vh",
    display: "none",
    backgroundColor: "#fff",
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "10px 20px",
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
    zIndex: "1000",
    fontWeight: "bold"
  });

  const nextEpisodeBtn = document.createElement('button');
  Object.assign(nextEpisodeBtn.style, {
    fontSize: "16px",
    fontWeight: "bold",
    backgroundColor: "transparent",
    color: "#000",
    border: "none",
    cursor: "pointer"
  });

  const closeIcon = document.createElement('div');
  closeIcon.innerHTML = "×";
  Object.assign(closeIcon.style, {
    position: "absolute",
    top: "-18px",
    right: "-9px",
    color: "#000",
    cursor: "pointer",
    fontSize: "40px",
    fontWeight: "bold",
    lineHeight: "1",
    textShadow: "0 0 4px #fff, 0 0 4px #fff"
  });

  closeIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    nextEpisodeContainer.style.display = "none";
    nextEpisodeClosed = true;
  });

  nextEpisodeContainer.appendChild(closeIcon);
  nextEpisodeContainer.appendChild(nextEpisodeBtn);

  const playerContainer = document.getElementById("player-container");
  if (playerContainer) {
    playerContainer.style.position = "relative";
    playerContainer.appendChild(nextEpisodeContainer);
  } else {
    console.error("Player container not found.");
  }

  // Setup next episode logic once at initialization
  (async () => {
    // Use the cached getSeasonDetails to fetch the current season details
    const seasonDetails = await getSeasonDetails(tmdb, season);
    if (!seasonDetails) return;

    const totalEpisodes = seasonDetails.episodes.length;
    let nextEpisodeNum = parseInt(episode) + 1;
    let nextSeasonNum = parseInt(season);

    if (nextEpisodeNum > totalEpisodes) {
      nextSeasonNum += 1;
      nextEpisodeNum = 1;
      const nextSeasonDetails = await getSeasonDetails(tmdb, nextSeasonNum);
      if (nextSeasonDetails && nextSeasonDetails.episodes && nextSeasonDetails.episodes.length > 0) {
        nextEpisodeText = "Next Season";
        nextEpisodeUrl = `/embed/tv/${tmdb}/${nextSeasonNum}/${nextEpisodeNum}`;
      }
    } else {
      nextEpisodeUrl = `/embed/tv/${tmdb}/${nextSeasonNum}/${nextEpisodeNum}`;
    }

    if (nextEpisodeUrl) {
      nextEpisodeBtn.textContent = nextEpisodeText;
      nextEpisodeBtn.addEventListener('click', () => {
        window.location.href = nextEpisodeUrl;
      });
    } else {
      // If no next episode or season, remove the container
      nextEpisodeContainer.remove();
    }
  })();

  video.addEventListener('timeupdate', () => {
    if (nextEpisodeClosed || !nextEpisodeUrl) return;
    if (!isNaN(video.duration) && video.duration > 0) {
      const timeRemaining = video.duration - video.currentTime;
      nextEpisodeContainer.style.display = (timeRemaining <= 120) ? "block" : "none";
    }
  });
}

// ------------------- Season/Episode Overlay -------------------

// Get the button element from the DOM
const sebutton = document.getElementById("sebutton");

if (window.type === "tv" && sebutton) {
  sebutton.style.display = "inline-block"; // Show button if type is "tv"
} else if (sebutton) {
  sebutton.style.display = "none"; // Hide button otherwise
}

// Add a click event listener to trigger the overlay
if (sebutton) {
  sebutton.addEventListener('click', async () => {
    // Use the provided dynamic values (tmdb, season, episode)
    window.playerContainer = document.getElementById("player-container");
    await createSeasonEpisodeOverlay(window.playerContainer, tmdb, season, episode);
  });
}

// Overlay function (reusing caching via getSeasonDetails and fetchShowDetails)
async function createSeasonEpisodeOverlay(container, tmdb, season, episode) {
  // Prevent multiple overlays from being created
  if (document.getElementById('seasonEpisodeOverlay')) return;

  // Create overlay element
  const overlay = document.createElement('div');
  overlay.id = 'seasonEpisodeOverlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    bottom: '0',
    left: '0',
    width: '100%',
    minHeight: '30%',
    maxHeight: '90vh',
    height: 'auto',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    overflowY: 'auto',
    transition: 'transform 0.3s ease-in-out, height 0.3s ease-in-out',
    transform: 'translateY(100%)',
    zIndex: '10000'
  });

  const contentContainer = document.createElement('div');
  Object.assign(contentContainer.style, {
    width: '100%',
    padding: '20px',
    textAlign: 'center'
  });
  overlay.appendChild(contentContainer);
  document.body.appendChild(overlay);

  // Animate overlay into view
  setTimeout(() => {
    overlay.style.transform = 'translateY(0)';
  }, 50);

  let showData;
  let episodesCache = {}; // Local cache for episodes within overlay (if needed)
  try {
    showData = await fetchShowDetails(tmdb);
  } catch (err) {
    console.error('Error fetching show data:', err);
    return;
  }

  const validSeasons = showData.seasons.filter(s => s.season_number >= 1);

  async function loadSeasonEpisodes(seasonNumber) {
    // Use global caching from getSeasonDetails (local episodesCache not needed)
    const data = await getSeasonDetails(tmdb, seasonNumber);
    return data.episodes;
  }

  let isSeasonListVisible = false;

  const headerRow = document.createElement('div');
  Object.assign(headerRow.style, {
    width: '100%',
    padding: '10px 15px',
    backgroundColor: '#222',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  });

  const leftPart = document.createElement('div');
  leftPart.style.display = 'flex';
  leftPart.style.alignItems = 'center';
  leftPart.style.cursor = 'pointer';

  const arrowIcon = document.createElement('i');
  arrowIcon.className = 'fas fa-arrow-left';
  Object.assign(arrowIcon.style, {
    fontSize: '20px',
    marginRight: '10px',
    color: '#fff',
    marginLeft: '20px'
  });
  leftPart.appendChild(arrowIcon);

  const seasonsText = document.createElement('strong');
  seasonsText.innerText = 'Seasons';
  Object.assign(seasonsText.style, {
    fontSize: '20px'
  });
  leftPart.appendChild(seasonsText);

  leftPart.addEventListener('click', () => {
    if (isSeasonListVisible) {
      isSeasonListVisible = false;
      arrowIcon.className = 'fas fa-arrow-left';
      showEpisodeList(displayedSeason);
    } else {
      isSeasonListVisible = true;
      arrowIcon.className = 'fas fa-arrow-right';
      showSeasonList();
    }
  });
  headerRow.appendChild(leftPart);

  const currentSeasonText = document.createElement('span');
  currentSeasonText.innerText = `Season ${season}`;
  Object.assign(currentSeasonText.style, {
    fontSize: '20px',
    marginRight: '20px'
  });
  headerRow.appendChild(currentSeasonText);

  overlay.appendChild(headerRow);

  const contentPanel = document.createElement('div');
  Object.assign(contentPanel.style, {
    flex: '1',
    width: '100%',
    overflowY: 'auto',
    backgroundColor: '#111'
  });
  overlay.appendChild(contentPanel);

  const footer = document.createElement('div');
  Object.assign(footer.style, {
    width: '100%',
    backgroundColor: '#000',
    textAlign: 'center',
    padding: '10px 0'
  });
  const closeButton = document.createElement('button');
  closeButton.innerText = 'Close';
  Object.assign(closeButton.style, {
    backgroundColor: '#000',
    color: '#fff',
    padding: '10px 20px',
    border: '1px solid #fff',
    borderRadius: '5px',
    fontSize: '16px',
    cursor: 'pointer'
  });
  closeButton.addEventListener('click', () => {
    overlay.style.transform = 'translateY(100%)';
    setTimeout(() => overlay.remove(), 300);
  });
  footer.appendChild(closeButton);
  overlay.appendChild(footer);

  // Append the overlay to the player container
  container.appendChild(overlay);

  let displayedSeason = Number(season);

  async function showEpisodeList(seasonNumber) {
    displayedSeason = seasonNumber;
    contentPanel.innerHTML = '';
    isSeasonListVisible = false;
    arrowIcon.className = 'fas fa-arrow-left';
    currentSeasonText.innerText = `Season ${seasonNumber}`;

    const episodes = await loadSeasonEpisodes(seasonNumber);
    episodes.forEach((ep) => {
      const epDiv = document.createElement('div');
      Object.assign(epDiv.style, {
        padding: '10px 15px',
        borderBottom: '1px solid #333',
        cursor: 'pointer'
      });
      epDiv.innerText = `E${ep.episode_number}  ${ep.name}`;
      if (Number(season) === seasonNumber && Number(episode) === ep.episode_number) {
        epDiv.style.backgroundColor = '#333';
      }
      epDiv.addEventListener('click', () => {
        window.location.href = `/embed/tv/${tmdb}/${seasonNumber}/${ep.episode_number}`;
      });
      contentPanel.appendChild(epDiv);
    });
  }

  function showSeasonList() {
    contentPanel.innerHTML = '';
    currentSeasonText.innerText = `Season ${displayedSeason}`;
    validSeasons.forEach((s) => {
      const seasonDiv = document.createElement('div');
      Object.assign(seasonDiv.style, {
        padding: '10px 15px',
        borderBottom: '1px solid #333',
        cursor: 'pointer'
      });
      seasonDiv.innerText = s.name;
      if (Number(displayedSeason) === s.season_number) {
        seasonDiv.style.backgroundColor = '#333';
      }
      seasonDiv.addEventListener('click', async () => {
        await showEpisodeList(s.season_number);
      });
      contentPanel.appendChild(seasonDiv);
    });
  }

  showEpisodeList(Number(season));
}



