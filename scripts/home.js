// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  remove,
  set,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDUeqGf_Ju0qJNMN-Ove3MabtEBtXUApEQ",
  authDomain: "login-example-f4d97.firebaseapp.com",
  databaseURL: "https://login-example-f4d97-default-rtdb.firebaseio.com",
  projectId: "login-example-f4d97",
  storageBucket: "login-example-f4d97.appspot.com",
  messagingSenderId: "600470826744",
  appId: "1:600470826744:web:c71b029207a21f5f5c950d",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Track current user
let currentUser = null;

// Function to fetch anime data from Firebase
async function fetchAnimeDataFromFirebase() {
  if (!currentUser) {
    return { watchlist: [], ongoing: [], completed: [] };
  }

  try {
    const userAnimeRef = ref(database, `users/${currentUser.uid}/animeList`);
    const snapshot = await get(userAnimeRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      return {
        watchlist: data.watchlist ? Object.values(data.watchlist) : [],
        ongoing: data.ongoing ? Object.values(data.ongoing) : [],
        completed: data.completed ? Object.values(data.completed) : [],
      };
    }

    return { watchlist: [], ongoing: [], completed: [] };
  } catch (error) {
    console.error("Error fetching anime data:", error);
    return { watchlist: [], ongoing: [], completed: [] };
  }
}

// Function to create anime cards
function createAnimeCards(category, gridId) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = ""; // Clear existing content

  if (category.length === 0) {
    const emptyMessage = document.createElement("div");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = "No anime in this list yet";
    grid.appendChild(emptyMessage);
    return;
  }

  category.forEach((anime) => {
    const card = document.createElement("div");
    card.className = "anime-card";
    card.innerHTML = `
      <img src="${anime.image}" alt="${anime.title}" class="anime-image">
      <h3 class="anime-title">${anime.title}</h3>
      <p class="subtitle">${
        anime.releaseDate || "Release date not available"
      }</p>
    `;

    // Add click event to show more details
    card.addEventListener("click", () => {
      let category = "watchlist"; // Default category is 'watchlist'
      if (document.getElementById("ongoingGrid").contains(card))
        category = "ongoing";
      if (document.getElementById("completedGrid").contains(card))
        category = "completed";

      showAnimeDetails(anime, category);
    });

    grid.appendChild(card);
  });
}

// Function to show anime details in a modal
function showAnimeDetails(anime, currentCategory) {
  // Create modal elements
  const modal = document.createElement("div");
  modal.className = "anime-modal";

  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-button">&times;</span>
      <img src="${anime.image}" alt="${anime.title}" class="modal-image">
      <h2>${anime.title}</h2>
      <p><strong>Release Date:</strong> ${anime.releaseDate}</p>
      <p><strong>Rating:</strong> ${anime.rating}</p>
      <p><strong>Episodes:</strong> ${anime.episodes}</p>
      <p><strong>Description:</strong></p>
      <p>${anime.description}</p>
      
      <!-- Modal buttons -->
      <div class="modal-buttons">
        <button class="modal-btn ongoing-btn ${
          currentCategory === "ongoing" ? "hidden" : ""
        }">Ongoing</button>
        <button class="modal-btn completed-btn ${
          currentCategory === "completed" ? "hidden" : ""
        }">Completed</button>
        <button class="modal-btn watchlist-btn ${
          currentCategory === "watchlist" ? "hidden" : ""
        }">Watchlist</button>
        <button class="modal-btn remove-btn">Remove</button>
      </div>
    </div>
  `;

  // Add modal to page
  document.body.appendChild(modal);

  // Show modal
  setTimeout(() => modal.classList.add("show"), 10);

  // Close modal functionality
  const closeBtn = modal.querySelector(".close-button");
  closeBtn.onclick = () => {
    modal.classList.remove("show");
    setTimeout(() => modal.remove(), 300);
  };

  // Click outside to close
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove("show");
      setTimeout(() => modal.remove(), 300);
    }
  };

  // Handle the Ongoing Button
  const ongoingBtn = modal.querySelector(".ongoing-btn");
  ongoingBtn.onclick = async () => {
    await moveAnimeToCategory(anime, "ongoing");
    modal.classList.remove("show");
    setTimeout(() => modal.remove(), 100); // Close the modal after action
  };

  // Handle the Completed Button
  const completedBtn = modal.querySelector(".completed-btn");
  completedBtn.onclick = async () => {
    await moveAnimeToCategory(anime, "completed");
    modal.classList.remove("show");
    setTimeout(() => modal.remove(), 100); // Close the modal after action
  };

  // Handle the Watchlist Button
  const watchlistBtn = modal.querySelector(".watchlist-btn");
  watchlistBtn.onclick = async () => {
    await moveAnimeToCategory(anime, "watchlist");
    modal.classList.remove("show");
    setTimeout(() => modal.remove(), 100); // Close the modal after action
  };

  // Handle the Remove Button
  const removeBtn = modal.querySelector(".remove-btn");
  removeBtn.onclick = async () => {
    await removeAnimeFromCategory(anime);
    modal.classList.remove("show");
    setTimeout(() => modal.remove(), 100); // Close the modal after action
  };
}

// Function to move anime to a different category
async function moveAnimeToCategory(anime, category) {
  try {
    const categories = ["watchlist", "ongoing", "completed"];
    let categoryFound = false;

    // Remove from current category
    for (const currentCategory of categories) {
      if (currentCategory !== category) {
        const categoryRef = ref(
          database,
          `users/${currentUser.uid}/animeList/${currentCategory}`
        );
        const snapshot = await get(categoryRef);

        if (snapshot.exists()) {
          const animeList = snapshot.val();
          const animeKey = Object.keys(animeList).find(
            (key) => animeList[key].title === anime.title
          );

          if (animeKey) {
            // Remove anime from the current category
            const animeRef = ref(
              database,
              `users/${currentUser.uid}/animeList/${currentCategory}/${animeKey}`
            );
            await remove(animeRef);

            // Add anime to the new category
            const newCategoryRef = ref(
              database,
              `users/${currentUser.uid}/animeList/${category}/${animeKey}`
            );
            await set(newCategoryRef, animeList[animeKey]);

            categoryFound = true;
            console.log(`Moved '${anime.title}' to '${category}'`);

            updateGrids(); // Refresh the grids to reflect the changes
            break;
          }
        }
      }
    }

    if (!categoryFound) {
      console.error("Category not found for anime:", anime);
    }
  } catch (error) {
    console.error("Error moving anime:", error);
  }
}

// Function to remove anime from a category
async function removeAnimeFromCategory(anime) {
  try {
    const categories = ["watchlist", "ongoing", "completed"];
    let categoryFound = false;

    for (const category of categories) {
      const categoryRef = ref(
        database,
        `users/${currentUser.uid}/animeList/${category}`
      );
      const snapshot = await get(categoryRef);

      if (snapshot.exists()) {
        const animeList = snapshot.val();
        const animeKey = Object.keys(animeList).find(
          (key) => animeList[key].title === anime.title
        );

        if (animeKey) {
          // Remove anime from the category
          const animeRef = ref(
            database,
            `users/${currentUser.uid}/animeList/${category}/${animeKey}`
          );
          await remove(animeRef);

          categoryFound = true;
          console.log(`Removed '${anime.title}' from category: ${category}`);

          updateGrids(); // Refresh the grids to reflect the changes
          break;
        }
      }
    }

    if (!categoryFound) {
      console.error("Category not found for anime:", anime);
    }
  } catch (error) {
    console.error("Error removing anime:", error);
  }
}

// Function to update all grids
async function updateGrids() {
  const { watchlist, ongoing, completed } = await fetchAnimeDataFromFirebase();

  createAnimeCards(watchlist, "watchlistGrid");
  createAnimeCards(ongoing, "ongoingGrid");
  createAnimeCards(completed, "completedGrid");
}

// Tab switching functionality
const tabs = document.querySelectorAll(".tab");
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    // Remove active class from all tabs
    tabs.forEach((t) => t.classList.remove("active"));
    // Add active class to clicked tab
    tab.classList.add("active");

    // Show the content of the selected tab
    const selectedTab = tab.getAttribute("data-tab");
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.style.display = content.classList.contains(selectedTab)
        ? "block"
        : "none";
    });

    // Update the grids when switching tabs
    updateGrids();
  });
});

// Check authentication state and initialize
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    // Initialize the page
    const watchlistTab = document.querySelector('[data-tab="watchlist"]');
    watchlistTab.classList.add("active");

    document.querySelectorAll(".tab-content").forEach((content) => {
      content.style.display = content.classList.contains("watchlist")
        ? "block"
        : "none";
    });

    updateGrids();
  } else {
    // Redirect to createprofile if not authenticated
    window.location.href = "pages/createprofile.html";
  }
});

// Search button functionality
function search() {
  window.location.href = "pages/search.html";
}

// Export the search function
window.search = search;
