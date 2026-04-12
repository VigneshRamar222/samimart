import { db } from "/public/js/firebase-config.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

(function () {
  const currentPage =
    window.location.pathname.split("/").pop().split("?")[0] || "index.html";
  const navLinks = document.querySelectorAll("#mainNavbar .nav-link");
  navLinks.forEach(function (link) {
    const linkPage = link.getAttribute("href");
    if (linkPage === currentPage) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
})();

window.addEventListener("scroll", function () {
  const navbar = document.getElementById("mainNavbar");
  if (!navbar) return;
  if (window.scrollY > 30) {
    navbar.style.boxShadow = "0 4px 16px rgba(0,0,0,0.18)";
  } else {
    navbar.style.boxShadow = "0 2px 10px rgba(0,0,0,0.15)";
  }
});

document.addEventListener("DOMContentLoaded", function () {
  initSmoothScroll();
  initCardAnimation();
  initCounter();
  initBackToTop();
});

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        e.preventDefault();
        window.scrollTo({
          top: target.offsetTop - 80,
          behavior: "smooth",
        });
      }
    });
  });
}

function initCardAnimation() {
  const cards = document.querySelectorAll(".card");
  if (!cards.length) return;

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 },
  );

  cards.forEach(function (card) {
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    card.style.transition = "opacity 0.4s ease, transform 0.4s ease";
    observer.observe(card);
  });
}

function initCounter() {
  const counters = document.querySelectorAll("[data-count]");
  if (!counters.length) return;

  const countObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const target = parseInt(entry.target.getAttribute("data-count"));
          let current = 0;
          const step = Math.ceil(target / 60);
          const timer = setInterval(function () {
            current += step;
            if (current >= target) {
              current = target;
              clearInterval(timer);
            }
            entry.target.textContent = current.toLocaleString() + "+";
          }, 25);
          countObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 },
  );

  counters.forEach(function (counter) {
    countObserver.observe(counter);
  });
}

function initBackToTop() {
  const btn = document.createElement("button");
  btn.innerHTML = '<i class="bi bi-arrow-up-short fs-4"></i>';
  btn.setAttribute("title", "Back to top");
  btn.style.cssText = [
    "position:fixed",
    "bottom:28px",
    "right:28px",
    "width:44px",
    "height:44px",
    "border-radius:50%",
    "border:none",
    "background:#0d9488",
    "color:#fff",
    "display:none",
    "align-items:center",
    "justify-content:center",
    "cursor:pointer",
    "box-shadow:0 4px 12px rgba(0,0,0,0.2)",
    "z-index:9999",
    "transition:opacity 0.3s",
  ].join(";");

  document.body.appendChild(btn);

  window.addEventListener("scroll", function () {
    if (window.scrollY > 200) {
      btn.style.display = "block";
    } else {
      btn.style.display = "none";
    }
  });

  btn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

export function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const cartCountElem = document.getElementById("cartCount");

  if (!cartCountElem) return;

  const totalItems = cart.reduce(
    (sum, item) => sum + ((item.items && item.items.length) || 0),
    0,
  );

  cartCountElem.textContent = totalItems;
}

updateCartCount();
async function loadFooterCategories() {
  const footerLists = document.querySelectorAll("[data-footer-categories]");
  if (!footerLists.length) return;

  try {
    const catSnap = await getDocs(collection(db, "categories"));
    const categories = catSnap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((cat) => cat.Categories)
      .sort((a, b) => String(a.Categories).localeCompare(String(b.Categories)));

    const topCategories = categories.slice(0, 5);

    footerLists.forEach((list) => {
      list.innerHTML = "";

      if (!topCategories.length) {
        list.innerHTML = `<li><a href="categories.html">Browse Categories</a></li>`;
        return;
      }

      topCategories.forEach((cat) => {
        list.insertAdjacentHTML(
          "beforeend",
          `<li><a href="categories.html?catid=${cat.id}">${cat.Categories}</a></li>`,
        );
      });
    });
  } catch (err) {
    console.error("Footer categories load failed:", err);
    footerLists.forEach((list) => {
      list.innerHTML = `<li><a href="categories.html">Browse Categories</a></li>`;
    });
  }
}

loadFooterCategories();

const input = document.getElementById("searchInput");
const suggestionBox = document.getElementById("searchSuggestions");

if (input && suggestionBox) {
  let searchData = [];
  let selectedIndex = -1;

  async function loadSearchData() {
    const subSnap = await getDocs(collection(db, "subcategories"));
    const catSnap = await getDocs(collection(db, "categories"));

    const categoryMap = {};
    catSnap.docs.forEach((doc) => {
      categoryMap[doc.id] = doc.data().Categories || "";
    });

    searchData = subSnap.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        Categories: categoryMap[data.CategoriesCode] || "",
        subCategoryLower: (data.SubCategories || "").toLowerCase(),
        itemsArray: data.items
          ? data.items
              .split(",")
              .map((i) => i.trim().toLowerCase())
              .filter(Boolean)
          : [],
      };
    });
  }

  loadSearchData().catch((err) => {
    console.error("Search data load failed:", err);
  });

  let debounceTimer;

  input.addEventListener("input", function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      handleSearch(this.value);
    }, 250);
  });

  function handleSearch(value) {
    const query = value.toLowerCase();
    suggestionBox.innerHTML = "";
    selectedIndex = -1;

    const results = searchData.filter((item) => {
      const subCategory =
        item.subCategoryLower || item.SubCategories.toLowerCase();

      return (
        subCategory.includes(query) ||
        (item.itemsArray || []).some((i) => i.includes(query))
      );
    });

    if (query.length >= 2 && results.length === 0) {
      // alert("wel");
      suggestionBox.innerHTML = "";
      const div = document.createElement("div");
      div.classList.add("fm-suggestion-item");
      div.innerHTML = `<small class="text-muted">No results found</small>`;
      suggestionBox.appendChild(div);
      suggestionBox.style.display = "block";

      div.onclick = () => {
        window.location.href = `categories.html?search=${encodeURIComponent(query)}`;
      };
      return;
    }
    if (query.length < 2) {
      suggestionBox.style.display = "none";
      return;
    }
    results.slice(0, 8).forEach((item, index) => {
      const div = document.createElement("div");
      div.classList.add("fm-suggestion-item");

      let matchedItem = "";

      if (item.items) {
        const found = (item.itemsArray || []).find((i) => i.includes(query));
        if (found) {
          matchedItem = `<br><small class="text-primary">${found.trim()}</small>`;
        }
      }

      div.innerHTML = `
      <strong>${item.SubCategories}</strong>
      ${matchedItem}
      <br>
      <small class="text-muted">${item.Categories}</small>
    `;

      div.onclick = () => {
        window.location.href = `categories.html?catid=${item.CategoriesCode}&sub=${item.id}`;
      };

      suggestionBox.appendChild(div);
    });

    suggestionBox.style.display = results.length ? "block" : "none";
  }

  input.addEventListener("keydown", function (e) {
    const items = suggestionBox.querySelectorAll(".fm-suggestion-item");

    if (!items.length) return;

    if (e.key === "ArrowDown") {
      selectedIndex++;
      if (selectedIndex >= items.length) selectedIndex = 0;

      updateHighlight(items);
    } else if (e.key === "ArrowUp") {
      selectedIndex--;
      if (selectedIndex < 0) selectedIndex = items.length - 1;

      updateHighlight(items);
    } else if (e.key === "Enter") {
      e.preventDefault();

      const query = input.value.trim();

      if (selectedIndex > -1) {
        items[selectedIndex].click();
        return;
      }

      if (query.length > 0) {
        window.location.href = `categories.html?search=${encodeURIComponent(query)}`;
      }
    }
  });

  function updateHighlight(items) {
    items.forEach((item) => item.classList.remove("active"));

    if (selectedIndex >= 0) {
      items[selectedIndex].classList.add("active");

      items[selectedIndex].scrollIntoView({
        block: "nearest",
      });
    }
  }

  document.addEventListener("click", function (e) {
    const searchBar = document.querySelector(".fm-search-bar");

    if (searchBar && !searchBar.contains(e.target)) {
      suggestionBox.style.display = "none";
    }
  });
}

// document.addEventListener("contextmenu", (e) => e.preventDefault());

// document.onkeydown = function (e) {
//   if (
//     (e.ctrlKey && ["u", "c", "s", "a"].includes(e.key.toLowerCase())) ||
//     (e.ctrlKey && e.shiftKey && ["i", "j"].includes(e.key.toLowerCase())) ||
//     e.key === "F12"
//   ) {
//     return false;
//   }
// };

// document.addEventListener("dragstart", (e) => e.preventDefault());
