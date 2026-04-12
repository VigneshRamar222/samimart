import { db } from "/public/js/firebase-config.js";
import {
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { updateCartCount } from "/js/main.js";

document.getElementById("year").textContent = new Date().getFullYear();

const subcategoriesContainer = document.getElementById("subcategories");
const categoriesLoader = document.getElementById("categoriesLoader");

const categorySearchInputs = document.querySelectorAll(
  "#categorySearch, #categorySearchDesktop",
);

categorySearchInputs.forEach((input) => {
  input.addEventListener("keyup", function () {
    const keyword = this.value.toLowerCase();
    document
      .querySelectorAll("#categoryFilter li, #categoryFilterDesktop li")
      .forEach((li) => {
        const text = li.textContent.toLowerCase();
        li.style.display = text.includes(keyword) ? "" : "none";
      });
  });
});

const params = new URLSearchParams(window.location.search);
const catid = params.get("catid");
const search = params.get("search");
const sub = params.get("sub");

let cart = JSON.parse(localStorage.getItem("cart")) || [];
let itemsPerPage = 10;
let currentPage = 0;
let filteredItems = [];
let subcategoryData = [];

function loadDataOnce(catid = "") {
  let q;

  if (catid && catid !== "") {
    q = query(
      collection(db, "subcategories"),
      where("CategoriesCode", "==", catid),
    );
  } else {
    q = query(collection(db, "subcategories"));
  }

  return getDocs(q).then((snapshot) => {
    subcategoryData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  });
}

function removeShowMoreButton() {
  const btn = document.getElementById("showMoreBtn");
  if (btn) btn.closest("div").remove();
}

function setLoadingState(isLoading, message = "Loading categories...") {
  if (!categoriesLoader || !subcategoriesContainer) return;
  categoriesLoader.style.display = isLoading ? "block" : "none";
  subcategoriesContainer.classList.toggle("is-loading", isLoading);
}

function initLoad() {
  const container = subcategoriesContainer;
  removeShowMoreButton();
  setLoadingState(false);

  filteredItems = subcategoryData;

  if (filteredItems.length === 0) {
    container.innerHTML = "<p class='text-center'>No items found</p>";
    return;
  }

  currentPage = 0;
  container.innerHTML = "";
  renderItems();
}

function renderItems() {
  const container = subcategoriesContainer;
  setLoadingState(false);

  const nextItems = filteredItems.slice(
    currentPage,
    currentPage + itemsPerPage,
  );

  nextItems.forEach((item) => {
    const highlight = cart.some(
      (c) =>
        String(c.SubCategoriesCode) === String(item.id) &&
        String(c.CategoriesCode) === String(item.CategoriesCode),
    );

    const itemsArray = item.items
      ? item.items.split(",").map((i) => i.trim())
      : [];
    const itemCount = itemsArray.length;
    const image =
      item.SubImageURL || "/assets/images/subcategories/noitemfound.jpg";

    const html = `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="card h-100 text-center p-3 border-0 shadow-sm ${highlight ? "highlight-card" : ""}">
          <img src="${image}" alt="${item.SubCategories}" loading="lazy" class="fm-cat-img mb-2">
          <h6 class="fw-bold">${item.SubCategories}</h6>
          <p class="text-muted small">${itemsArray.slice(0, 3).join(", ")}${itemsArray.length > 3 ? "..." : ""}</p>
          <span class="badge bg-success">${itemCount}+ items</span>
          <button class="btn btn-success btn-sm mt-2" data-bs-toggle="modal" data-bs-target="#askItemModel"
            data-category="${item.CategoriesCode}" 
            data-subcategory="${item.id}"
            data-items="${item.items || ""}">
            Add to Cart
          </button>
        </div>
      </div>
    `;

    container.insertAdjacentHTML("beforeend", html);
  });

  currentPage += itemsPerPage; // FIX: use renamed variable
  let existingButton = document.getElementById("showMoreBtn");
  const remainingItems = filteredItems.length - currentPage;

  if (remainingItems > 0) {
    const btnText = `Show More (${remainingItems} items left)`;

    if (!existingButton) {
      const btnHtml = `<div class="text-center mt-4">
        <button class="btn btn-outline-primary" id="showMoreBtn">${btnText}</button>
      </div>`;
      container.insertAdjacentHTML("afterend", btnHtml);
      document
        .getElementById("showMoreBtn")
        .addEventListener("click", renderItems);
    } else {
      existingButton.textContent = btnText;
    }
  } else if (existingButton) {
    existingButton.remove();
  }
}

function loadSubcategoriesBySearch(searchQuery) {
  setLoadingState(false);
  filteredItems = subcategoryData.filter((item) => {
    const sub = item.SubCategories.toLowerCase();
    const items = item.items ? item.items.toLowerCase() : "";
    return (
      sub.includes(searchQuery.toLowerCase()) ||
      items.includes(searchQuery.toLowerCase())
    );
  });

  const container = subcategoriesContainer;
  removeShowMoreButton();
  container.innerHTML = "";

  if (filteredItems.length === 0) {
    container.innerHTML = "<p class='text-center'>No results found</p>";
    return;
  }

  currentPage = 0;
  renderItems();
}

function loadSubcategoryByCode(subcategoryCode) {
  setLoadingState(false);
  filteredItems = subcategoryData.filter(
    (item) => String(item.id) === String(subcategoryCode),
  );

  const container = subcategoriesContainer;
  removeShowMoreButton();
  container.innerHTML = "";

  if (filteredItems.length === 0) {
    container.innerHTML = "<p class='text-center'>No items found</p>";
    return;
  }

  currentPage = 0;
  renderItems();
}

const askItemModal = document.getElementById("askItemModel");
let currentTriggerButton = null;

askItemModal.addEventListener("show.bs.modal", function (event) {
  const button = event.relatedTarget;
  currentTriggerButton = button;
  const category = button.dataset.category;
  const subcategory = button.dataset.subcategory;
  const items = button.dataset.items
    ? button.dataset.items.split(",").map((i) => i.trim())
    : [];
  const form = askItemModal.querySelector("#itemForm");
  form.innerHTML = "";

  const existingCartEntry = cart.find(
    (item) =>
      String(item.CategoriesCode) === String(category) &&
      String(item.SubCategoriesCode) === String(subcategory),
  );

  const selectedInCart = existingCartEntry
    ? existingCartEntry.items.map((i) => i.name)
    : [];

  items.forEach((item, index) => {
    const cleanItem = item.trim();
    const id = `itemCheckbox${index}`;
    const isChecked = selectedInCart.includes(cleanItem);
    const div = document.createElement("div");
    div.classList.add("form-check");
    div.innerHTML = `
      <div class="d-flex align-items-center gap-2 mb-2">
        <input class="form-check-input mt-0 item-check"
              type="checkbox"
              value="${cleanItem}"
              id="${id}"
              ${isChecked ? "checked" : ""}>
        <label class="form-check-label flex-grow-1" for="${id}">
          ${cleanItem}
        </label>
        <div class="item-remark-wrapper ${isChecked ? "active" : ""}">
          <input type="text"
                class="form-control form-control-sm item-remark"
                placeholder="Remarks"
                data-item="${cleanItem}"
                value="${existingCartEntry?.items?.find((i) => i.name === cleanItem)?.remark || ""}">
        </div>
      </div>
    `;
    form.appendChild(div);

    const checkbox = div.querySelector(".item-check");
    const remarkWrapper = div.querySelector(".item-remark-wrapper");
    const remarkBox = remarkWrapper.querySelector(".item-remark");

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        remarkWrapper.classList.add("active");
        remarkBox.disabled = false;
        remarkBox.focus();
      } else {
        remarkWrapper.classList.remove("active");
        remarkBox.value = "";
        remarkBox.disabled = true;
      }
    });
  });

  askItemModal.dataset.category = category;
  askItemModal.dataset.subcategory = subcategory;
});

document.getElementById("confirmItems").addEventListener("click", () => {
  const form = document.getElementById("itemForm");
  const selectedItems = [];

  form.querySelectorAll(".item-check:checked").forEach((cb) => {
    const itemName = cb.value;
    const remarkInput = form.querySelector(
      `.item-remark[data-item="${itemName}"]`,
    );
    selectedItems.push({
      name: itemName,
      remark: remarkInput ? remarkInput.value : "",
    });
  });

  if (selectedItems.length === 0) {
    showToast("Please select at least one item.");
    return;
  }

  const category = askItemModal.dataset.category;
  const subcategory = askItemModal.dataset.subcategory;
  addToCart(category, subcategory, currentTriggerButton, selectedItems);

  const modalInstance = bootstrap.Modal.getOrCreateInstance(askItemModal);
  modalInstance.hide();
});

function addToCart(CategoriesCode, SubCategoriesCode, btn, itemslist) {
  const selectedItems = Array.isArray(itemslist) ? itemslist : [itemslist];

  const existingIndex = cart.findIndex(
    (item) =>
      String(item.CategoriesCode) === String(CategoriesCode) &&
      String(item.SubCategoriesCode) === String(SubCategoriesCode),
  );

  if (existingIndex !== -1) {
    cart[existingIndex].items = selectedItems.filter(
      (item, index, self) =>
        index === self.findIndex((i) => i.name === item.name),
    );
    showToast("Cart updated!");
  } else {
    cart.push({
      CategoriesCode,
      SubCategoriesCode,
      items: selectedItems,
    });
    showToast("Item(s) added to cart!");
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount(); // FIX: now always defined above
  const card = btn.closest(".card");
  if (card) {
    card.classList.add("highlight-card");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className =
    "toast align-items-center text-bg-success border-0 show position-fixed bottom-0 end-0 m-3";
  toast.innerHTML = `<div class="d-flex">
    <div class="toast-body">${message}</div>
  </div>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

getDocs(collection(db, "categories")).then((snapshot) => {
  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const listMobile = document.getElementById("categoryFilter");
  const listDesktop = document.getElementById("categoryFilterDesktop");

  listMobile.innerHTML = "";
  listDesktop.innerHTML = "";

  [listMobile, listDesktop].forEach((list) => {
    list.insertAdjacentHTML(
      "beforeend",
      `<li class="list-group-item ${!catid ? "active" : ""}" data-id="">
        All Categories
      </li>`,
    );
  });

  let categoryFound = false;

  data.forEach((cat) => {
    const isActive = String(cat.id) === String(catid);

    if (isActive) categoryFound = true;

    [listMobile, listDesktop].forEach((list) => {
      list.insertAdjacentHTML(
        "beforeend",
        `<li class="list-group-item ${isActive ? "active" : ""}" data-id="${cat.id}">
          ${cat.Categories}
        </li>`,
      );
    });
  });

  if (catid && !categoryFound) {
    document
      .querySelectorAll(
        '#categoryFilter li[data-id=""], #categoryFilterDesktop li[data-id=""]',
      )
      .forEach((el) => el.classList.add("active"));
  }

  const active = document.querySelector(
    "#categoryFilter .active, #categoryFilterDesktop .active",
  );
  if (active) {
    active.scrollIntoView({ block: "center" });
  }
});

document.addEventListener("click", function (e) {
  const li = e.target.closest("#categoryFilter li, #categoryFilterDesktop li");

  if (li) {
    const selectedCatId = li.dataset.id;
    setLoadingState(
      true,
      selectedCatId ? "Loading category items..." : "Loading categories...",
    );

    document
      .querySelectorAll("#categoryFilter li, #categoryFilterDesktop li")
      .forEach((li) => li.classList.remove("active"));
    document
      .querySelectorAll(
        `#categoryFilter li[data-id="${selectedCatId}"], #categoryFilterDesktop li[data-id="${selectedCatId}"]`,
      )
      .forEach((li) => li.classList.add("active"));

    loadDataOnce(selectedCatId).then(() => {
      initLoad();
    });

    if (selectedCatId) {
      history.replaceState(null, "", `?catid=${selectedCatId}`);
    } else {
      history.replaceState(null, "", window.location.pathname);
    }

    const offcanvas = bootstrap.Offcanvas.getInstance(
      document.getElementById("categoryOffcanvas"),
    );
    if (window.innerWidth < 992 && offcanvas) {
      offcanvas.hide();
      document.body.classList.remove("overflow-hidden");
    }
  }
});

function enableKeyboardNavigation(inputId, listSelector) {
  const input = document.querySelector(inputId);
  let focusedIndex = -1;

  input.addEventListener("keydown", function (e) {
    const items = Array.from(
      document.querySelectorAll(`${listSelector} li`),
    ).filter((li) => li.style.display !== "none");

    if (!items.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusedIndex = (focusedIndex + 1) % items.length;
      updateActive(items);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      focusedIndex = (focusedIndex - 1 + items.length) % items.length;
      updateActive(items);
    }

    if (e.key === "Enter" && focusedIndex >= 0) {
      items[focusedIndex].click();
    }
  });

  function updateActive(items) {
    document
      .querySelectorAll(`${listSelector} li`)
      .forEach((li) => li.classList.remove("active"));

    const activeItem = items[focusedIndex];
    activeItem.classList.add("active");
    activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}
if (search) {
  setLoadingState(true, "Searching products...");
  loadDataOnce().then(() => {
    loadSubcategoriesBySearch(search);
  });
} else if (catid) {
  setLoadingState(true, "Loading category items...");
  loadDataOnce(catid).then(() => {
    if (sub) {
      loadSubcategoryByCode(sub);
      return;
    }
    initLoad();
  });
} else {
  setLoadingState(true, "Loading categories...");
  loadDataOnce().then(() => {
    if (sub) {
      loadSubcategoryByCode(sub);
      return;
    }
    initLoad();
  });
}

enableKeyboardNavigation("#categorySearch", "#categoryFilter");
enableKeyboardNavigation("#categorySearchDesktop", "#categoryFilterDesktop");
