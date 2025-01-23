// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  get,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Your Firebase configuration
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

// Check authentication state
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
  } else {
    // Redirect to login if not authenticated
    window.location.href = "../index.html";
  }
});

// Selecting the search input and results container
const searchInput = document.getElementById("search");
const resultsContainer = document.createElement("div");
resultsContainer.className = "results-grid";
document.body.appendChild(resultsContainer);

// Function to fetch anime data from Kitsu API
async function fetchAnime(query) {
  const url = `https://kitsu.io/api/edge/anime?filter[text]=${query}&page[limit]=10`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.data) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching data from Kitsu API:", error);
    return [];
  }
}

// Function to format the release date
function formatReleaseDate(dateString) {
  const date = new Date(dateString);
  const options = { year: "numeric", month: "long", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

// Function to store anime details in Firebase
async function storeAnimeDetails(
  title,
  releaseDate,
  rating,
  episodes,
  description,
  image,
  category
) {
  if (!currentUser) {
    showMessage("Please login to save anime!");
    alertMsg.style.backgroundColor = "#ee0c0c";
    return;
  }

  const animeDetails = {
    title,
    releaseDate,
    rating,
    episodes,
    description,
    image,
    timestamp: Date.now(),
  };

  try {
    // Reference to the user's anime list
    const userAnimeRef = ref(
      database,
      `users/${currentUser.uid}/animeList/${category}`
    );

    // Check if anime already exists
    const snapshot = await get(userAnimeRef);
    const existingAnime = snapshot.val();

    if (existingAnime) {
      const isDuplicate = Object.values(existingAnime).some(
        (anime) => anime.title === title
      );

      if (isDuplicate) {
        showMessage(`${title} is already in your ${category}!`);
        alertMsg.style.backgroundColor = "#ee0c0c";
        return;
      }
    }

    // Add new anime to the list
    await push(userAnimeRef, animeDetails);
    showMessage(`${title} has been added to your ${category}!`);
    alertMsg.style.backgroundColor = "#0b9a0b";
  } catch (error) {
    console.error("Error storing anime details:", error);
    showMessage("Failed to save anime. Please try again.");
    alertMsg.style.backgroundColor = "#ee0c0c";
  }
}

// Adding event listener for the input field
searchInput.addEventListener("input", async () => {
  const query = searchInput.value.trim().toLowerCase();
  resultsContainer.innerHTML = "";

  if (query) {
    const animeResults = await fetchAnime(query);

    if (animeResults.length > 0) {
      resultsContainer.innerHTML = "";

      animeResults.forEach((anime) => {
        const attributes = anime.attributes;
        const releaseDate = attributes.startDate
          ? formatReleaseDate(attributes.startDate)
          : "Release date not available";

        const rating = attributes.averageRating
          ? (attributes.averageRating / 10).toFixed(1)
          : "No rating available";
        const episodes = attributes.episodeCount
          ? attributes.episodeCount
          : "No episode count available";
        const description = attributes.synopsis || "No description available";

        const title =
          attributes.titles.en ||
          attributes.titles.en_jp ||
          attributes.canonicalTitle;

        const image = attributes.posterImage?.small || "";

        // Create a card for each anime
        const card = document.createElement("div");
        card.className = "result-card";

        card.innerHTML = `
          <img src="${image}" alt="${title}" loading="lazy" />
          <h3>${title}</h3>
          <p class="release-date">${releaseDate}</p>
        `;

        // Overlay and message elements
        let overlay = document.querySelector(".overlay");
        let showOptions = document.querySelector(".showOptions");
        let titleName = document.querySelector(".showOptions h2");
        let ratingScore = document.querySelector("#rating");
        let episodeNumber = document.querySelector("#episodes");
        let descriptionText = document.querySelector("#description");

        // Add click event to handle selection
        card.addEventListener("click", () => {
          overlay.style.display = "block";
          showOptions.style.display = "block";

          titleName.innerText = title;
          ratingScore.innerText = `${rating}/10`;
          episodeNumber.innerText = `${episodes} Episodes`;
          descriptionText.innerText = description;

          // Add click event listeners for buttons
          document.getElementById("watchlist").onclick = () => {
            storeAnimeDetails(
              title,
              releaseDate,
              rating,
              episodes,
              description,
              image,
              "watchlist"
            );
            showOptions.style.display = "none";
            overlay.style.display = "none";
          };
          document.getElementById("ongoing").onclick = () => {
            storeAnimeDetails(
              title,
              releaseDate,
              rating,
              episodes,
              description,
              image,
              "ongoing"
            );
            showOptions.style.display = "none";
            overlay.style.display = "none";
          };
          document.getElementById("completed").onclick = () => {
            storeAnimeDetails(
              title,
              releaseDate,
              rating,
              episodes,
              description,
              image,
              "completed"
            );
            showOptions.style.display = "none";
            overlay.style.display = "none";
          };
        });

        // Close message if clicked outside
        window.addEventListener("click", (e) => {
          if (e.target != showOptions && e.target == overlay) {
            showOptions.style.display = "none";
            overlay.style.display = "none";
          }
        });

        resultsContainer.appendChild(card);
      });
    } else {
      resultsContainer.innerHTML = `<p style="text-align: center; color: gray;">No results found</p>`;
    }
  }
});

// Profile section
let profile = document.querySelector(".profile-icon");
profile.addEventListener("click", () => {
  window.location.href = "../pages/createprofile.html";
});

// Bookmark icon functionality
function home() {
  window.location.href = "../index.html";
}

// Show Message
const alertMsg = document.querySelector(".alertMsg");

function showMessage(message) {
  alertMsg.textContent = message;
  alertMsg.classList.add("show");
  setTimeout(() => {
    alertMsg.classList.remove("show");
  }, 3000);
}
