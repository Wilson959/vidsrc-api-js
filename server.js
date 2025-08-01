////////////////////////////////
// SERVER BUTTON SUPPORT      //
////////////////////////////////

console.log("[servers.js] Initializing server button support...");

if (!document.getElementById("server-button")) {
  window.serverButton = document.createElement("button");
  window.serverButton.id = "server-button";
  window.serverButton.className = "server-button-top-left";
  window.serverButton.innerHTML = `
   <svg xmlns:xlink="http://www.w3.org/1999/xlink" class="MuiBox-root mui-gt632c" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="46" height="46"><path d="M17.4776 10.0001C17.485 10 17.4925 10 17.5 10C19.9853 10 22 12.0147 22 14.5C22 16.9853 19.9853 19 17.5 19H7C4.23858 19 2 16.7614 2 14C2 11.4003 3.98398 9.26407 6.52042 9.0227M17.4776 10.0001C17.4924 9.83536 17.5 9.66856 17.5 9.5C17.5 6.46243 15.0376 4 12 4C9.12324 4 6.76233 6.20862 6.52042 9.0227M17.4776 10.0001C17.3753 11.1345 16.9286 12.1696 16.2428 13M6.52042 9.0227C6.67826 9.00768 6.83823 9 7 9C8.12582 9 9.16474 9.37209 10.0005 10" stroke-width="1.5px" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.8" stroke="#FFFFFF" fill="none"></path></svg>
  `;

  document.getElementById("player-container").appendChild(window.serverButton);
  console.log("[servers.js] Server button added to top left of the player container.");
}

window.serverButton.addEventListener("click", () => {
  const container = document.getElementById("server-list-container");
  if (!container) return console.error("[servers.js] Server list container not found.");
  
  container.classList.toggle("show");
  console.log(`[servers.js] Server list ${container.classList.contains("show") ? "opened" : "closed"}.`);
  if (container.classList.contains("show")) {
    window.showServerList();
  }
});

window.showServerList = function () {
  const container = document.getElementById("server-list-container");
  const list = document.getElementById("server-list");

  if (!container || !list) {
    console.error("[servers.js] Server list container or list element not found.");
    return;
  }

  console.log("[servers.js] Showing server list.");
  list.innerHTML = "";

  const selectedIndex = typeof window.currentQualityIndex === "number" ? window.currentQualityIndex : 0;

  if (!window.sourceEntries || window.sourceEntries.length === 0) {
    console.warn("[servers.js] No source entries found.");
    return;
  }

  window.sourceEntries.forEach((entry, idx) => {
    if (!entry.url) return;

    const item = document.createElement("div");
    item.classList.add("server-list-item");
    if (idx === selectedIndex) {
      item.classList.add("selected");
    }

    // Updated inner HTML with flag and language
    item.innerHTML = `
      <div class="server-list-item-title">${entry.name || "Source " + (idx + 1)}</div>
      <div class="server-list-item-lang">${entry.language || "Original audio"}</div>
      <div class="server-list-item-flag">
        <img src="/flags/${entry.flag}.png" alt="${entry.flag}" title="${entry.flag}">
      </div>
    `;

    item.addEventListener("mouseenter", () => {
      // Prevent hover effect for selected items
      if (!item.classList.contains("selected")) {
        item.style.backgroundColor = "#3a3a3a"; // Normal hover effect for non-selected
      }
    });

    item.addEventListener("mouseleave", () => {
      // Revert the hover effect when mouse leaves (for non-selected items)
      if (!item.classList.contains("selected")) {
        item.style.backgroundColor = "#1a1a1a"; // Default background
      }
    });

    item.addEventListener("click", () => {
      // If the active source is clicked, do nothing
      if (window.currentQualityIndex === idx) {
        console.log("Source", idx, "is already active. No action taken.");
        return;
      }

      console.log(`[servers.js] Server list item ${idx} clicked. Loading source: ${entry.url}`);

      // Update index and reload
      window.failedSources = [];
      window.currentQualityIndex = idx;
      window.loadSource(entry.url, window.sourceEntries.map(s => s.url));
    });

    list.appendChild(item);
  });

  container.classList.add("show");
  console.log("[servers.js] Server list container is now visible.");
};

Object.defineProperty(window, 'currentQualityIndex', {
  set: function (value) {
    const oldValue = this._currentQualityIndex;
    this._currentQualityIndex = value;
    if (oldValue !== value) {
      const items = document.querySelectorAll(".server-list-item");
      items.forEach((item, idx) => {
        // Add the "selected" class only to the active index
        if (idx === value) {
          item.classList.add("selected");
        } else {
          item.classList.remove("selected");
        }

        // Prevent hover on selected items
        if (item.classList.contains("selected")) {
          item.style.backgroundColor = "#1a1a1a"; // Reset to the default background for selected item
        }
      });
    }
  },
  get: function () {
    return this._currentQualityIndex;
  }
});

const closeBtn = document.getElementById("server-list-close-btn");
if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    const container = document.getElementById("server-list-container");
    if (container) {
      container.classList.remove("show");
      console.log("[servers.js] Server list container closed.");
    }
  });
} else {
  console.warn("[servers.js] Close button for server list not found.");
}
