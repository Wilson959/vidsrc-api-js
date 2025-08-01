document.addEventListener("DOMContentLoaded", function () {
  window.video = document.getElementById("video");
  window.playPause = document.getElementById("playPause");
  window.muteUnmute = document.getElementById("muteUnmute");
  window.fullscreen = document.getElementById("fullscreen");
  window.progressBar = document.getElementById("progress-bar");
  window.timeCounter = document.getElementById("timeCounter");
  window.centerPlay = document.getElementById("center-play");
  window.seekBack = document.getElementById("seek-back");
  window.seekForward = document.getElementById("seek-forward");
  window.centerControls = document.getElementById("center-controls");
  window.playerContainer = document.getElementById("player-container");
  window.pip = document.getElementById("pip");
  window.captionContainer = document.getElementById("custom-captions");


  ////////////////////////////////
  // SETTINGS MENU ELEMENTS     //
  ////////////////////////////////
  window.settings = document.getElementById("settings");
  window.settingsMenu = document.getElementById("settings-main-menu");
  window.settingsOptionQuality = document.getElementById("menu-item-quality");
  window.settingsOptionCaptions = document.getElementById("menu-item-captions");
  window.settingsOptionPlayback = document.getElementById("menu-item-playback");

  // Insert the Customize option immediately after Captions.
  let settingsOptionCustomize = document.getElementById("menu-item-customize");
  if (!settingsOptionCustomize) {
    settingsOptionCustomize = document.createElement("div");
    settingsOptionCustomize.className = "settings-menu-item";
    settingsOptionCustomize.id = "menu-item-customize";
    settingsOptionCustomize.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i><span>Customize</span><i class="fa-solid fa-chevron-right"></i>';
    // Insert before Playback so that the order is Quality, Captions, Customize, Playback.
    settingsMenu.insertBefore(settingsOptionCustomize, settingsOptionPlayback);
  }

   window.qualityOptions = document.getElementById("quality-options");
  window.settingsMenuQuality = document.getElementById("settings-quality-menu");
  window.qualityBack = document.getElementById("quality-back");
  window.settingsMenuPlayback = document.getElementById("settings-playback-menu");
  window.playbackBack = document.getElementById("playback-back");
  window.playbackOptions = document.getElementById("playback-options");
  window.settingsMenuCaptions = document.getElementById("settings-captions-menu");
  window.captionsBack = document.getElementById("captions-back");
  window.captionsOptions = document.getElementById("captions-options");

  // Create the Customize sub-menu container if not already created.
  let settingsMenuCustomize = document.getElementById("settings-customize-menu");
  if (!settingsMenuCustomize) {
    settingsMenuCustomize = document.createElement("div");
    settingsMenuCustomize.id = "settings-customize-menu";
    settingsMenuCustomize.className = "settings-menu hidden";
    playerContainer.appendChild(settingsMenuCustomize);
  }

  ////////////////////////////////
  // CAST/ AIRPLAY SUPPORT      //
  ////////////////////////////////
  // Insert the Cast/AirPlay button into the right controls.
  window.rightControls = document.getElementById("right-controls");
  window.settingsButton = document.getElementById("settings");
  if (rightControls) {
   // Create cast button.
window.castButton = document.createElement("button");
castButton.id = "cast-button";
castButton.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11zM21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-6v2h6c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
  </svg>
`;


// Remove inline styles
if (settingsButton) {
  rightControls.insertBefore(castButton, settingsButton);
} else {
  rightControls.appendChild(castButton);
}

    // Chromecast using provided method.
    function startChromecast() {
      if (!window.chrome || !window.chrome.cast || !chrome.cast.isAvailable) {
        console.log('Waiting for Cast API to load...');
        setTimeout(startChromecast, 1000);
        return;
      }
      window.sessionRequest = new chrome.cast.SessionRequest(chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID);
      window.apiConfig = new chrome.cast.ApiConfig(sessionRequest, function () {}, function () {});
      chrome.cast.initialize(apiConfig, function () {
        chrome.cast.requestSession(function (session) {
          console.log('Casting started:', session);
        }, function (error) {
          console.error('Error starting cast:', error);
        });
      }, function (error) {
        console.error('Error initializing Cast API:', error);
      });
    }
    // AirPlay using provided method.
    function startAirPlay() {
      if (window.WebKitPlaybackTargetAvailabilityEvent) {
        window.videoElement = document.querySelector('video');
        if (videoElement && typeof videoElement.webkitShowPlaybackTargetPicker === "function") {
          videoElement.webkitShowPlaybackTargetPicker();
        } else {
          console.error('AirPlay not supported in this browser.');
        }
      } else {
        console.error('AirPlay API not available.');
      }
    }
    function isAppleDevice() {
      return /Mac|iPhone|iPad/i.test(navigator.userAgent);
    }
    castButton.addEventListener("click", () => {
      if (isAppleDevice()) {
        startAirPlay();
      } else {
        startChromecast();
      }
    });
  } else {
    console.error("Right controls container not found.");
  }

  
//////////////////////////////
// CORE PLAYER CONTROLS       //
//////////////////////////////

// Global flags
let isBuffering = true;
let controlTimeout;
let controlsVisible = true;
let wasBuffering = false;
let isInitialLoad = true; // Tracks initial load
let isSeeking = false;    // Tracks seeking

// Define SVG icons and spinner markup
const playIcon    = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
const pauseIcon   = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5h-4z"/></svg>';
const spinnerIcon = `<svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 120 120" aria-hidden="true">
  <path d="M 114,60 A 54,54 0 1,1 110.77,41.53" stroke="currentColor" stroke-width="9" fill="none" />
</svg>`;

// Immediately set the spinner if centerPlay is available; otherwise, wait for DOMContentLoaded
if (document.readyState !== "loading" && typeof centerPlay !== "undefined") {
  centerPlay.innerHTML = spinnerIcon;
} else {
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof centerPlay !== "undefined") {
      centerPlay.innerHTML = spinnerIcon;
    }
  });
}

// Centralized function to update the center icon
function updateCenterIcon() {
  if (isBuffering) {
    centerPlay.innerHTML = spinnerIcon;
  } else {
    centerPlay.innerHTML = video.paused ? playIcon : pauseIcon;
  }
}

// Toggle play/pause only when the video is ready
function togglePlayPause(e) {
  if (e) e.stopPropagation();

  // If buffering, don't proceed
  if (isBuffering) {
    return;
  }

  // Check if video is ready to play
  if (video.readyState < video.HAVE_ENOUGH_DATA) {
    // If not ready, trigger a small seek to wake up the video
    const currentTime = video.currentTime;
    video.currentTime = currentTime + 0.001; // Small seek forward
    video.addEventListener(
      "seeked",
      () => {
        if (video.paused) {
          video.play();
          playPause.innerHTML = pauseIcon;
        }
        updateCenterIcon();
      },
      { once: true }
    );
    return;
  }

  // If ready, proceed with play/pause toggle
  if (video.paused) {
    video.play();
    playPause.innerHTML = pauseIcon;
  } else {
    video.pause();
    playPause.innerHTML = playIcon;
    // When manually pausing, show additional controls
    centerControls.style.display = "flex";
    seekBack.style.display = "block";
    seekForward.style.display = "block";
  }

  updateCenterIcon();
}

playPause.addEventListener("click", togglePlayPause);
centerPlay.addEventListener("click", togglePlayPause);

seekBack.addEventListener("click", (e) => {
  e.stopPropagation();
  isSeeking = true;
  video.currentTime = Math.max(video.currentTime - 10, 0);
});

seekForward.addEventListener("click", (e) => {
  e.stopPropagation();
  isSeeking = true;
  if (video.duration) {
    video.currentTime = Math.min(video.currentTime + 10, video.duration);
  }
});

muteUnmute.addEventListener("click", () => {
  video.muted = !video.muted;
  muteUnmute.innerHTML = video.muted
    ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M301.1 34.8C312.6 40 320 51.4 320 64l0 384c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352 64 352c-35.3 0-64-28.7-64-64l0-64c0-35.3 28.7-64 64-64l67.8 0L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3zM425 167l55 55 55-55c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-55 55 55 55c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-55-55-55 55c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l55-55-55-55c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0z"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path d="M533.6 32.5C598.5 85.2 640 165.8 640 256s-41.5 170.7-106.4 223.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C557.5 398.2 592 331.2 592 256s-34.5-142.2-88.7-186.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM473.1 107c43.2 35.2 70.9 88.9 70.9 149s-27.7 113.8-70.9 149c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C475.3 341.3 496 301.1 496 256s-20.7-85.3-53.2-111.8c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zm-60.5 74.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM301.1 34.8C312.6 40 320 51.4 320 64l0 384c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352 64 352c-35.3 0-64-28.7-64-64l0-64c0-35.3 28.7-64 64-64l67.8 0L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3z"/></svg>';
});

pip.addEventListener("click", async (e) => {
  e.stopPropagation();
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await video.requestPictureInPicture();
    }
  } catch (error) {
    console.error("PiP toggle failed:", error);
  }
});

fullscreen.addEventListener("click", () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const video = playerContainer.querySelector("video");

  // iOS-specific fullscreen handling
  if (isIOS && video && typeof video.webkitEnterFullscreen === "function") {
    video.webkitEnterFullscreen();
    return;
  }

  // Standard fullscreen toggle
  if (!document.fullscreenElement) {
    if (playerContainer.requestFullscreen) {
      playerContainer.requestFullscreen();
    } else if (playerContainer.webkitRequestFullscreen) {
      playerContainer.webkitRequestFullscreen();
    } else if (playerContainer.mozRequestFullScreen) {
      playerContainer.mozRequestFullScreen();
    } else if (playerContainer.msRequestFullscreen) {
      playerContainer.msRequestFullscreen();
    }

    playerContainer.classList.add("fullscreen");

    fullscreen.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
        <path d="M160 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64-64 0c-17.7 0-32 
        14.3-32 32s14.3 32 32 32l96 0c17.7 0 32-14.3 32-32l0-96zM32 
        320c-17.7 0-32 14.3-32 32s14.3 32 32 32l64 0 0 64c0 17.7 14.3 32 32 
        32s32-14.3 32-32l0-96c0-17.7-14.3-32-32-32l-96 0zM352 64c0-17.7-14.3-32-32-32s-32 
        14.3-32 32l0 96c0 17.7 14.3 32 32 32l96 0c-17.7 0 32-14.3 
        32-32s-14.3-32-32-32l-64 0 0-64zM320 320c-17.7 0-32 14.3-32 
        32l0 96c0 17.7 14.3 32 32 32s32-14.3 32-32l0-64 64 
        0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0z"/>
      </svg>
    `;

    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape").catch((err) => {
        console.log("Orientation lock failed:", err);
      });
    }

  } else {
    document.exitFullscreen?.();

    playerContainer.classList.remove("fullscreen");

    fullscreen.innerHTML = `
      <svg xmlns:xlink="http://www.w3.org/1999/xlink" 
        xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" 
        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
        stroke-linejoin="round" class="Styluslucide lucide-maximize">
        <path d="M8 3H5a2 2 0 0 0-2 2v3" stroke="#FFFFFF" fill="none" stroke-width="2px"></path>
        <path d="M21 8V5a2 2 0 0 0-2-2h-3" stroke="#FFFFFF" fill="none" stroke-width="2px"></path>
        <path d="M3 16v3a2 2 0 0 0 2 2h3" stroke="#FFFFFF" fill="none" stroke-width="2px"></path>
        <path d="M16 21h3a2 2 0 0 0 2-2v-3" stroke="#FFFFFF" fill="none" stroke-width="2px"></path>
      </svg>
    `;

    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  }
});


video.addEventListener("timeupdate", () => {
  if (video.duration) {
    let percent = (video.currentTime / video.duration) * 100;
    progressBar.value = percent;
    timeCounter.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
  }
});

progressBar.addEventListener("input", () => {
  isSeeking = true;
  if (video.duration) {
    let seekTime = (progressBar.value / 100) * video.duration;
    video.currentTime = seekTime;
  }fullscreen.addEventListener("click", () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const video = playerContainer.querySelector("video");

  // iOS-specific fullscreen handling
  if (isIOS && video && typeof video.webkitEnterFullscreen === "function") {
    video.webkitEnterFullscreen();
    return;
  }

  // Standard fullscreen toggle
  if (!document.fullscreenElement) {
    if (playerContainer.requestFullscreen) {
      playerContainer.requestFullscreen();
    } else if (playerContainer.webkitRequestFullscreen) {
      playerContainer.webkitRequestFullscreen();
    } else if (playerContainer.mozRequestFullScreen) {
      playerContainer.mozRequestFullScreen();
    } else if (playerContainer.msRequestFullscreen) {
      playerContainer.msRequestFullscreen();
    }

    playerContainer.classList.add("fullscreen");

    fullscreen.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
        <path d="M160 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64-64 0c-17.7 0-32 
        14.3-32 32s14.3 32 32 32l96 0c17.7 0 32-14.3 32-32l0-96zM32 
        320c-17.7 0-32 14.3-32 32s14.3 32 32 32l64 0 0 64c0 17.7 14.3 32 32 
        32s32-14.3 32-32l0-96c0-17.7-14.3-32-32-32l-96 0zM352 64c0-17.7-14.3-32-32-32s-32 
        14.3-32 32l0 96c0 17.7 14.3 32 32 32l96 0c-17.7 0 32-14.3 
        32-32s-14.3-32-32-32l-64 0 0-64zM320 320c-17.7 0-32 14.3-32 
        32l0 96c0 17.7 14.3 32 32 32s32-14.3 32-32l0-64 64 
        0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0z"/>
      </svg>
    `;

    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape").catch((err) => {
        console.log("Orientation lock failed:", err);
      });
    }

  } else {
    document.exitFullscreen?.();

    playerContainer.classList.remove("fullscreen");

    fullscreen.innerHTML = `
      <svg xmlns:xlink="http://www.w3.org/1999/xlink" 
        xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" 
        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
        stroke-linejoin="round" class="Styluslucide lucide-maximize">
        <path d="M8 3H5a2 2 0 0 0-2 2v3" stroke="#FFFFFF" fill="none" stroke-width="2px"></path>
        <path d="M21 8V5a2 2 0 0 0-2-2h-3" stroke="#FFFFFF" fill="none" stroke-width="2px"></path>
        <path d="M3 16v3a2 2 0 0 0 2 2h3" stroke="#FFFFFF" fill="none" stroke-width="2px"></path>
        <path d="M16 21h3a2 2 0 0 0 2-2v-3" stroke="#FFFFFF" fill="none" stroke-width="2px"></path>
      </svg>
    `;

    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  }
});

});

video.addEventListener("seeked", () => {
  isSeeking = false;
});

function formatTime(time) {
  let hours   = Math.floor(time / 3600);
  let minutes = Math.floor((time % 3600) / 60);
  let seconds = Math.floor(time % 60);
  let hh = hours > 0 ? `${hours.toString().padStart(2, "0")}:` : "";
  return `${hh}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// Update icon according to video buffering state
video.addEventListener("waiting", () => {
  isBuffering = true;
  if (!isInitialLoad && !isSeeking) {
    wasBuffering = true; // Set only for non-initial, non-seeking buffering
  }
  updateCenterIcon();
  seekBack.style.display = "none";
  seekForward.style.display = "none";
  centerControls.style.display = "flex";
});

video.addEventListener("canplay", () => {
  isBuffering = false;
  updateCenterIcon();
});

video.addEventListener("playing", () => {
  isBuffering = false;
  updateCenterIcon();
  seekBack.style.display = "block";
  seekForward.style.display = "block";
  
  if (wasBuffering) {
    // Immediately hide controls for non-initial, non-seeking buffering
    clearTimeout(controlTimeout);
    playerContainer.classList.add("hide-controls");
    controlsVisible = false;
    centerControls.style.display = "none";
    if (serverButton) {
      serverButton.style.display = "none";
    }
    const playerTitle = document.getElementById("player-title");
    if (playerTitle) {
      playerTitle.style.display = "none";
    }
    wasBuffering = false; // Reset the flag
  }
  
  if (isInitialLoad) {
    isInitialLoad = false; // Reset after first play
  }
});

video.addEventListener("pause", () => {
  isBuffering = false;
  updateCenterIcon();
  seekBack.style.display = "block";
  seekForward.style.display = "block";
  centerControls.style.display = "flex";
  clearTimeout(controlTimeout);
});

//////////////////////////////
// AUTO-HIDE & TOGGLE CONTROLS //
//////////////////////////////

// Auto-hide controls when video is playing and not buffering
function autoHideControls() {
  if (!video.paused && !isBuffering) {
    const isSettingsOpen = 
      !settingsMenu.classList.contains("hidden") ||
      !settingsMenuQuality.classList.contains("hidden") ||
      !settingsMenuPlayback.classList.contains("hidden") ||
      !settingsMenuCaptions.classList.contains("hidden") ||
      !settingsMenuCustomize.classList.contains("hidden");

    if (!isSettingsOpen) {
      playerContainer.classList.add("hide-controls");
      controlsVisible = false;
    }
    centerControls.style.display = "none";
    if (serverButton) {
      serverButton.style.display = "none";
    }
    const playerTitle = document.getElementById("player-title");
    if (playerTitle) {
      playerTitle.style.display = "none";
    }
    // *** Close the server list if open ***
    const serverListContainer = document.getElementById("server-list-container");
    if (serverListContainer && serverListContainer.classList.contains("show")) {
      serverListContainer.classList.remove("show");
      console.log("[autoHideControls] Server list closed automatically.");
    }
  }
}

function showControls() {
  playerContainer.classList.remove("hide-controls");
  controlsVisible = true;
  clearTimeout(controlTimeout);
  centerControls.style.display = "flex";
  updateCenterIcon();
  seekBack.style.display = "block";
  seekForward.style.display = "block";
  if (serverButton) {
    serverButton.style.display = "block";
  }
  const playerTitle = document.getElementById("player-title");
  if (playerTitle) {
    playerTitle.style.display = "block";
  }
  if (!video.paused) {
    controlTimeout = setTimeout(autoHideControls, 10000);
  }
}

function toggleControls() {
  if (isBuffering) {
    showControls();
    return;
  }
  
  // *** Close the server list if it is open ***
  const serverListContainer = document.getElementById("server-list-container");
  if (serverListContainer && serverListContainer.classList.contains("show")) {
    serverListContainer.classList.remove("show");
    console.log("[toggleControls] Server list closed due to tap.");
  }
  
  if (controlsVisible) {
    playerContainer.classList.add("hide-controls");
    controlsVisible = false;
    centerControls.style.display = "none";
    clearTimeout(controlTimeout);
    if (serverButton) {
      serverButton.style.display = "none";
    }
    const playerTitle = document.getElementById("player-title");
    if (playerTitle) {
      playerTitle.style.display = "none";
    }
  } else {
    showControls();
  }
}

// Add a 100ms delay before toggling controls on tap
playerContainer.addEventListener("pointerup", (e) => {
  if (
    e.target.closest("button") ||
    e.target.closest("input") ||
    e.target.closest("#center-controls") ||
    settingsMenu.contains(e.target) ||
    settingsMenuQuality.contains(e.target) ||
    settingsMenuPlayback.contains(e.target) ||
    settingsMenuCaptions.contains(e.target) ||
    settingsMenuCustomize.contains(e.target)
  ) {
    return;
  }
  setTimeout(toggleControls, 100);
});

playerContainer.addEventListener("pointermove", showControls);
video.addEventListener("play", showControls);
video.addEventListener("pause", showControls);
if (!video.paused) {
  controlTimeout = setTimeout(autoHideControls, 3000);
}


  ////////////////////////////////
  // SETTINGS & SUB-MENUS         //
  ////////////////////////////////
  settings.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsMenu.classList.toggle("hidden");
    qualityOptions.classList.add("hidden");
    settingsMenuQuality.classList.add("hidden");
    settingsMenuPlayback.classList.add("hidden");
    settingsMenuCaptions.classList.add("hidden");
    settingsMenuCustomize.classList.add("hidden");
  });
  settingsOptionQuality.addEventListener("click", (e) => {
    e.stopPropagation();
    if (hls && hls.levels && hls.levels.length > 1) {
      settingsMenu.classList.add("hidden");
      settingsMenuQuality.classList.remove("hidden");
      populateQualityOptions();
    } else {
      console.log("Only one quality available; skipping quality menu.");
    }
  });
  settingsOptionPlayback.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsMenu.classList.add("hidden");
    settingsMenuPlayback.classList.remove("hidden");
    populatePlaybackOptions();
  });
  settingsOptionCaptions.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsMenu.classList.add("hidden");
    settingsMenuCaptions.classList.remove("hidden");
    populateCaptionsOptions();
  });
  settingsOptionCustomize.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsMenu.classList.add("hidden");
    settingsMenuCustomize.classList.remove("hidden");
    buildCustomizePanel(); // Build/update customize panel content
  });
  qualityBack.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsMenuQuality.classList.add("hidden");
    settingsMenu.classList.remove("hidden");
  });
  playbackBack.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsMenuPlayback.classList.add("hidden");
    settingsMenu.classList.remove("hidden");
  });
  captionsBack.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsMenuCaptions.classList.add("hidden");
    settingsMenu.classList.remove("hidden");
  });
  // Back button for Customize sub-menu is handled in buildCustomizePanel().

 //////////////////////////////
// QUALITY & PLAYBACK OPTIONS //
//////////////////////////////

function populateQualityOptions() {
  qualityOptions.innerHTML = "";
  if (!hls || !hls.levels || hls.levels.length === 0) return;
  createQualityItem("Auto", -1, currentQualityIndex === -1);
  hls.levels.forEach((level, i) => {
    const label = level.height ? `${level.height}p` : `Level ${i}`;
    const isActive = i === currentQualityIndex;
    createQualityItem(label, i, isActive);
  });
}

function createQualityItem(label, levelIndex, isActive) {
  const row = document.createElement("div");
  row.className = "settings-menu-item";
  if (isActive) row.classList.add("active");

  const iconHTML = isActive
    ? '<i class="fa-solid fa-circle-dot radio-icon"></i>'
    : '<i class="fa-regular fa-circle radio-icon"></i>';
  row.innerHTML = iconHTML + `<span>${label}</span>`;
  row.addEventListener("click", (ev) => {
    ev.stopPropagation();
    setQuality(levelIndex);
    settingsMenuQuality.classList.add("hidden");
    settingsMenu.classList.remove("hidden");
  });
  qualityOptions.appendChild(row);
}

function setQuality(index) {
  currentQualityIndex = index;
  if (index === -1) {
    hls.currentLevel = -1;
    document.getElementById("current-quality").textContent = "Auto";
  } else {
    hls.currentLevel = index;
    const levelInfo = hls.levels[index];
    document.getElementById("current-quality").textContent = levelInfo.height
      ? `${levelInfo.height}p`
      : `Level ${index}`;
  }
}

function populatePlaybackOptions() {
  playbackOptions.innerHTML = "";
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  speeds.forEach((speed) => {
    const label = speed === 1 ? "Normal" : `${speed}x`;
    createPlaybackItem(label, speed, video.playbackRate === speed);
  });
}

function createPlaybackItem(label, speed, isActive) {
  const row = document.createElement("div");
  row.className = "settings-menu-item";
  if (isActive) row.classList.add("active");

  const iconHTML = isActive
    ? '<i class="fa-solid fa-circle-dot radio-icon"></i>'
    : '<i class="fa-regular fa-circle radio-icon"></i>';
  row.innerHTML = iconHTML + `<span>${label}</span>`;

  row.addEventListener("click", (ev) => {
    ev.stopPropagation();
    video.playbackRate = speed;
    // Remove active state and update icons for all items
    const items = playbackOptions.querySelectorAll(".settings-menu-item");
    items.forEach(item => {
      item.classList.remove("active");
      const icon = item.querySelector("i.radio-icon");
      if (icon) {
        icon.className = "fa-regular fa-circle radio-icon";
      }
    });
    // Set active state for clicked item
    row.classList.add("active");
    const clickedIcon = row.querySelector("i.radio-icon");
    if (clickedIcon) {
      clickedIcon.className = "fa-solid fa-circle-dot radio-icon";
    }
    document.getElementById("current-playback").textContent = label;
  });
  playbackOptions.appendChild(row);
}

//////////////////////////////
// CUSTOM SLIDER & PANEL    //
//////////////////////////////

// Helper: Create a custom slider control.
function createCustomSlider({ min, max, step = 1, value, onChange }) {
  const sliderContainer = document.createElement("div");
  sliderContainer.style.position = "relative";
  sliderContainer.style.height = "8px";
  sliderContainer.style.background = "#444";
  sliderContainer.style.borderRadius = "4px";
  sliderContainer.style.flex = "1";
  sliderContainer.style.marginLeft = "10px";
  sliderContainer.style.cursor = "pointer";

  const thumb = document.createElement("div");
  thumb.style.position = "absolute";
  thumb.style.top = "-4px";
  thumb.style.width = "16px";
  thumb.style.height = "16px";
  thumb.style.background = "#fff";
  thumb.style.borderRadius = "50%";
  thumb.style.boxShadow = "0 0 2px rgba(0,0,0,0.8)";
  thumb.style.cursor = "pointer";

  function updateThumbPosition(val) {
    const percent = ((val - min) / (max - min)) * 100;
    thumb.style.left = `calc(${percent}% - 8px)`;
  }
  updateThumbPosition(value);

  let dragging = false;
  function startDrag(e) {
    dragging = true;
    e.preventDefault();
    e.stopPropagation();
  }

  function stopDrag() {
    dragging = false;
  }

  function onDrag(e) {
    if (!dragging) return;
    let clientX;
    if (e.touches && e.touches.length) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }
    const rect = sliderContainer.getBoundingClientRect();
    let newVal = ((clientX - rect.left) / rect.width) * (max - min) + min;
    newVal = Math.round(newVal / step) * step;
    newVal = Math.min(max, Math.max(min, newVal));
    updateThumbPosition(newVal);
    onChange(newVal);
  }

  thumb.addEventListener("mousedown", startDrag);
  thumb.addEventListener("touchstart", startDrag);
  document.addEventListener("mouseup", stopDrag);
  document.addEventListener("touchend", stopDrag);
  document.addEventListener("mousemove", onDrag);
  document.addEventListener("touchmove", onDrag, { passive: false });

  // Also allow tapping on the slider track.
  sliderContainer.addEventListener("click", (e) => {
    const rect = sliderContainer.getBoundingClientRect();
    let newVal = ((e.clientX - rect.left) / rect.width) * (max - min) + min;
    newVal = Math.round(newVal / step) * step;
    newVal = Math.min(max, Math.max(min, newVal));
    updateThumbPosition(newVal);
    onChange(newVal);
  });

  sliderContainer.appendChild(thumb);
  return sliderContainer;
}

// Function to build the Customize panel content.
function buildCustomizePanel() {
  settingsMenuCustomize.innerHTML = ""; // Clear previous content

  // Back button row.
  const backRow = document.createElement("div");
  backRow.className = "settings-menu-item";
  backRow.id = "customize-back";
  backRow.innerHTML = '<i class="fa-solid fa-chevron-left"></i><span>Customize</span>';
  backRow.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsMenuCustomize.classList.add("hidden");
    settingsMenu.classList.remove("hidden");
  });
  settingsMenuCustomize.appendChild(backRow);

 // FONT COLOR row using a full-spectrum color picker.
const colorRow = document.createElement("div");
colorRow.className = "settings-menu-item";

const colorLabel = document.createElement("span");
colorLabel.textContent = "Font Color:";
colorRow.appendChild(colorLabel);

const colorPicker = document.createElement("input");
colorPicker.type = "color";
colorPicker.value = currentColor;
colorPicker.style.marginLeft = "10px";
// Set explicit dimensions for the color picker button
colorPicker.style.width = "40px";  // adjust width as needed
colorPicker.style.height = "40px"; // adjust height as needed
// Remove flex if it's affecting the size
// colorPicker.style.flex = "1";

colorPicker.addEventListener("input", () => {
  currentColor = colorPicker.value;
  applyCustomizeStyles();
});
colorRow.appendChild(colorPicker);

settingsMenuCustomize.appendChild(colorRow);


  // FONT SIZE row using custom slider.
  const fontSizeRow = document.createElement("div");
  fontSizeRow.className = "settings-menu-item";
  const fontSizeLabel = document.createElement("span");
  fontSizeLabel.textContent = `Font Size: ${currentFontSize}px`;
  fontSizeRow.appendChild(fontSizeLabel);
  const fontSizeSlider = createCustomSlider({
    min: 10,
    max: 50,
    step: 1,
    value: currentFontSize,
    onChange: (val) => {
      currentFontSize = val;
      fontSizeLabel.textContent = `Font Size: ${currentFontSize}px`;
      applyCustomizeStyles();
    }
  });
  fontSizeRow.appendChild(fontSizeSlider);
  settingsMenuCustomize.appendChild(fontSizeRow);

  // BACKGROUND OPACITY row using custom slider.
  const bgRow = document.createElement("div");
  bgRow.className = "settings-menu-item";
  const bgLabel = document.createElement("span");
  bgLabel.textContent = `Background: ${(currentBgOpacity * 100).toFixed(0)}%`;
  bgRow.appendChild(bgLabel);
  const bgSlider = createCustomSlider({
    min: 0,
    max: 100,
    step: 1,
    value: currentBgOpacity * 100,
    onChange: (val) => {
      currentBgOpacity = val / 100;
      bgLabel.textContent = `Background: ${val}%`;
      applyCustomizeStyles();
    }
  });
  bgRow.appendChild(bgSlider);
  settingsMenuCustomize.appendChild(bgRow);

  // POSITION row using custom slider.
  const posRow = document.createElement("div");
  posRow.className = "settings-menu-item";
  const posLabel = document.createElement("span");
  posLabel.textContent = `Position: ${currentPosition}px`;
  posRow.appendChild(posLabel);
  const posSlider = createCustomSlider({
    min: 0,
    max: 300,
    step: 1,
    value: currentPosition,
    onChange: (val) => {
      currentPosition = val;
      posLabel.textContent = `Position: ${currentPosition}px`;
      applyCustomizeStyles();
    }
  });
  posRow.appendChild(posSlider);
  settingsMenuCustomize.appendChild(posRow);

  // TIMING OFFSET row using custom slider.
  const offsetRow = document.createElement("div");
  offsetRow.className = "settings-menu-item";
  const offsetLabel = document.createElement("span");
  offsetLabel.textContent = `Timing: ${currentTimingOffset.toFixed(1)}s`;
  offsetRow.appendChild(offsetLabel);
  const offsetSlider = createCustomSlider({
    min: -20,
    max: 20,
    step: 0.1,
    value: currentTimingOffset,
    onChange: (val) => {
      currentTimingOffset = val;
      offsetLabel.textContent = `Timing: ${currentTimingOffset.toFixed(1)}s`;
    }
  });
  offsetRow.appendChild(offsetSlider);
  settingsMenuCustomize.appendChild(offsetRow);

  // Optional: +/-10s and Reset buttons row.
  const btnRow = document.createElement("div");
  btnRow.className = "settings-menu-item";
  btnRow.style.justifyContent = "space-between";

  const minus10 = document.createElement("button");
  minus10.textContent = "-1s";
  styleSmallButton(minus10);
  minus10.addEventListener("click", () => {
    currentTimingOffset -= 1;
    offsetLabel.textContent = `Timing: ${currentTimingOffset.toFixed(1)}s`;
  });

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Reset";
  styleSmallButton(resetBtn);
  resetBtn.addEventListener("click", () => {
    currentColor = "#ffffff";
    currentFontSize = 20;
    currentBgOpacity = 0.7;
    currentPosition = 80;
    currentTimingOffset = 0.0;
    buildCustomizePanel();
    applyCustomizeStyles();
  });

  const plus10 = document.createElement("button");
  plus10.textContent = "+1s";
  styleSmallButton(plus10);
  plus10.addEventListener("click", () => {
    currentTimingOffset += 1;
    offsetLabel.textContent = `Timing: ${currentTimingOffset.toFixed(1)}s`;
  });

  btnRow.appendChild(minus10);
  btnRow.appendChild(resetBtn);
  btnRow.appendChild(plus10);
  settingsMenuCustomize.appendChild(btnRow);
}

function styleSmallButton(btn) {
  Object.assign(btn.style, {
    backgroundColor: "#333",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: "4px",
    padding: "2px 8px",
    cursor: "pointer",
    fontSize: "12px",
  });
}

function applyCustomizeStyles() {
  const renderedCues = document.querySelectorAll(".custom-cue");
  renderedCues.forEach(cue => {
    cue.style.color = currentColor;
    cue.style.fontSize = `${currentFontSize}px`;
    cue.style.backgroundColor = `rgba(0,0,0,${currentBgOpacity})`;
  });
  captionContainer.style.bottom = `${currentPosition}px`;
}

//////////////////////////////
//    END OF CUSTOMIZE PANEL //
//////////////////////////////

  // Global click handler to hide settings menus when clicking outside.
  document.addEventListener("click", (e) => {
    if (
      !settingsMenu.contains(e.target) &&
      !settingsMenuQuality.contains(e.target) &&
      !settingsMenuPlayback.contains(e.target) &&
      !settingsMenuCaptions.contains(e.target) &&
      !settingsMenuCustomize.contains(e.target) &&
      e.target !== settings
    ) {
      settingsMenu.classList.add("hidden");
      settingsMenuQuality.classList.add("hidden");
      settingsMenuPlayback.classList.add("hidden");
      settingsMenuCaptions.classList.add("hidden");
      settingsMenuCustomize.classList.add("hidden");
    }
  });
});

/////////////////////////////
// PROGRESS BAR HANDLING   //
/////////////////////////////
document.addEventListener("DOMContentLoaded", function () {
  window.video = document.querySelector("video");
  window.progressBar = document.querySelector("#progress-bar");

  if (!video || !progressBar) {
    console.warn("Video element or progress bar not found!");
    return;
  }

  window.updateProgressBar = () => {
    window.playedPercentage = (video.currentTime / video.duration) * 100;
    window.buffered = getBufferedPercentage(video);
    progressBar.style.background = `linear-gradient(
      to right,
      white 0%,
      white ${playedPercentage}%,
      #999 ${playedPercentage}%,
      #999 ${buffered}%,
      #444 ${buffered}%,
      #444 100%
    )`;
    requestAnimationFrame(updateProgressBar);
  };

  window.getBufferedPercentage = (video) => {
    window.bufferRanges = video.buffered;
    if (!bufferRanges.length) return (video.currentTime / video.duration) * 100;
    let bufferedEnd = 0;
    for (let i = 0; i < bufferRanges.length; i++) {
      if (bufferRanges.start(i) <= video.currentTime && bufferRanges.end(i) > video.currentTime) {
        bufferedEnd = bufferRanges.end(i);
        break;
      }
    }
    return (bufferedEnd / video.duration) * 100;
  };

  video.addEventListener("play", updateProgressBar);
  video.addEventListener("timeupdate", updateProgressBar);
  video.addEventListener("progress", updateProgressBar);
});

document.addEventListener("DOMContentLoaded", () => {
  let lastTap = 0;
  const container = document.getElementById("player-container");
  const video = container.querySelector("video"); // Assuming video is inside the container

  function isiOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  function toggleFullScreen() {
    if (isiOS()) {
      if (video && video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen(); // iOS Safari only supports this
      } else {
        console.warn("Fullscreen not supported on this element in iOS.");
      }
    } else {
      if (!document.fullscreenElement) {
        container.requestFullscreen?.().then(() => {
          screen.orientation?.lock?.("landscape").catch((err) => {
            console.warn("Orientation lock failed:", err);
          });
        });
      } else {
        document.exitFullscreen?.().then(() => {
          screen.orientation?.unlock?.();
        });
      }
    }
  }

  container.addEventListener("touchend", (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength > 0 && tapLength < 300) {
      toggleFullScreen();
      e.preventDefault();
    }
    lastTap = currentTime;
  });
});


if (typeof cover !== "undefined" && cover) {
  // Create the overlay div
  const bgDiv = document.createElement("div");
  bgDiv.id = "cover-overlay";
  bgDiv.classList.add("cover-overlay");
  
  // Set the CSS custom property for background image.
  bgDiv.style.setProperty('--cover-bg', `url(${cover})`);
  
  // Add the overlay to the document
  document.body.appendChild(bgDiv);

  // Listen for the actual playback start (video has buffered enough)
  video.addEventListener("playing", () => {
    bgDiv.classList.add("fade-out");
    // Remove the overlay after the transition ends (0.5s)
    setTimeout(() => {
      bgDiv.remove();
    }, 500);
  });
}

const titleDiv = document.createElement("div");
titleDiv.id = "player-title";

if (type === "movie") {
  titleDiv.textContent = `${title} (${year})`;
} else if (type === "tv") {
  titleDiv.textContent = `${title} (${year}) S${season} E${episode}`;
}

document.getElementById("player-container").appendChild(titleDiv);

