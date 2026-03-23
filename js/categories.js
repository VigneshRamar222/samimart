document.getElementById("year").textContent = new Date().getFullYear();

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
const sub = params.get("sub");
const search = params.get("search");

let cart = JSON.parse(localStorage.getItem("cart")) || [];
let itemsPerPage = 10;
let currentIndex = 0;
let filteredItems = [];
let subcategoryData = [];

function loadDataOnce() {
  return fetch("assets/JSON/subcategories.json")
    .then((res) => res.json())
    .then((data) => {
      subcategoryData = data;
    });
}

function initLoad(catid = "", sub = "") {
  const container = document.getElementById("subcategories");
  container.innerHTML = "";
  filteredItems = catid
    ? subcategoryData.filter(
        (item) => item.CategoriesCode == catid && item.active == 1,
      )
    : subcategoryData.filter((item) => item.active == 1);
  currentIndex = 0;
  renderItems();
}

function renderItems() {
  const container = document.getElementById("subcategories");
  const nextItems = filteredItems.slice(
    currentIndex,
    currentIndex + itemsPerPage,
  );

  nextItems.forEach((item) => {
    const highlight = cart.some(
      (c) =>
        Number(c.SubCategoriesCode) === Number(item.SubCategoriesCode) &&
        Number(c.CategoriesCode) === Number(item.CategoriesCode),
    );

    const itemsArray = item.items?.split(",").map((i) => i.trim()) || [];
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
            data-subcategory="${item.SubCategoriesCode}"
            data-items="${item.items}">
            Add to Cart
          </button>
        </div>
      </div>
    `;

    container.insertAdjacentHTML("beforeend", html);
  });

  currentIndex += itemsPerPage;
  let existingButton = document.getElementById("showMoreBtn");
  const remainingItems = filteredItems.length - currentIndex;

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

const askItemModal = document.getElementById("askItemModel");
let currentTriggerButton = null;
askItemModal.addEventListener("show.bs.modal", function (event) {
  const button = event.relatedTarget;
  currentTriggerButton = button;
  const category = button.dataset.category;
  const subcategory = button.dataset.subcategory;
  const items = button.dataset.items.split(",").map((i) => i.trim());
  const form = askItemModal.querySelector("#itemForm");
  form.innerHTML = "";
  const existingCartEntry = cart.find(
    (item) =>
      Number(item.CategoriesCode) === Number(category) &&
      Number(item.SubCategoriesCode) === Number(subcategory),
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
  const existingEntry = cart.find(
    (item) =>
      Number(item.CategoriesCode) === Number(CategoriesCode) &&
      Number(item.SubCategoriesCode) === Number(SubCategoriesCode),
  );

  if (existingEntry) {
    existingEntry.items = selectedItems.filter(
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
  if (selectedItems.length === 0 && existingEntry) {
    cart = cart.filter(
      (item) =>
        !(
          item.CategoriesCode === CategoriesCode &&
          item.SubCategoriesCode === SubCategoriesCode
        ),
    );
    showToast("No items selected. Entry removed from cart.");
  }
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
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

fetch("assets/JSON/categories.json")
  .then((res) => res.json())
  .then((data) => {
    const listMobile = document.getElementById("categoryFilter");
    const listDesktop = document.getElementById("categoryFilterDesktop");
    listMobile.innerHTML = "";
    listDesktop.innerHTML = "";
    [listMobile, listDesktop].forEach((list) => {
      list.insertAdjacentHTML(
        "beforeend",
        `
              <li class="list-group-item ${!catid ? "active" : ""}" data-id="">
                All Categories
              </li>
            `,
      );
    });

    let categoryFound = false;

    data.forEach((cat) => {
      const isActive = String(cat.categoriescode) === String(catid);

      if (isActive) categoryFound = true;
      [listMobile, listDesktop].forEach((list) => {
        list.insertAdjacentHTML(
          "beforeend",
          `
                    <li class="list-group-item ${isActive ? "active" : ""}" data-id="${cat.categoriescode}">
                      ${cat.Categories}
                    </li>
                  `,
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
    const catid = li.dataset.id;
    document
      .querySelectorAll("#categoryFilter li, #categoryFilterDesktop li")
      .forEach((li) => li.classList.remove("active"));
    document
      .querySelectorAll(
        `#categoryFilter li[data-id="${catid}"], #categoryFilterDesktop li[data-id="${catid}"]`,
      )
      .forEach((li) => li.classList.add("active"));

    initLoad(catid);

    if (!catid) {
      history.replaceState(null, "", window.location.pathname);
    }

    // Close mobile offcanvas
    const offcanvas = bootstrap.Offcanvas.getInstance(
      document.getElementById("categoryOffcanvas"),
    );
    if (window.innerWidth < 992 && offcanvas) {
      offcanvas.hide();
      document.body.classList.remove("overflow-hidden");
    }
  }
});

function loadSubcategoriesBySearch(query) {
  const container = document.getElementById("subcategories");
  container.innerHTML = "";

  const filtered = subcategoryData.filter((item) => {
    const sub = item.SubCategories.toLowerCase();
    const items = item.items ? item.items.toLowerCase() : "";

    return (
      sub.includes(query.toLowerCase()) || items.includes(query.toLowerCase())
    );
  });

  filtered.forEach((item) => {
    const html = `<div class="col-md-3">
      <div class="card p-3 text-center">
        <h6>${item.SubCategories}</h6>
      </div>
    </div>`;

    container.insertAdjacentHTML("beforeend", html);
  });
}

function enableKeyboardNavigation(inputId, listSelector) {
  const input = document.querySelector(inputId);
  let currentIndex = -1;

  input.addEventListener("keydown", function (e) {
    const items = Array.from(
      document.querySelectorAll(`${listSelector} li`),
    ).filter((li) => li.style.display !== "none"); // only visible items

    if (!items.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      currentIndex = (currentIndex + 1) % items.length;
      updateActive(items);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      currentIndex = (currentIndex - 1 + items.length) % items.length;
      updateActive(items);
    }

    if (e.key === "Enter" && currentIndex >= 0) {
      items[currentIndex].click(); // trigger category click
    }
  });

  function updateActive(items) {
    // remove active from all
    document
      .querySelectorAll("#categoryFilter li, #categoryFilterDesktop li")
      .forEach((li) => li.classList.remove("active"));

    const activeItem = items[currentIndex];
    activeItem.classList.add("active");

    // auto scroll into view
    activeItem.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }
}

if (search) {
  loadDataOnce().then(() => {
    loadSubcategoriesBySearch(search);
  });
} else if (catid) {
  loadDataOnce().then(() => {
    initLoad(catid, sub);
  });
} else {
  loadDataOnce().then(() => {
    initLoad();
  });
}
enableKeyboardNavigation("#categorySearch", "#categoryFilter");
enableKeyboardNavigation("#categorySearchDesktop", "#categoryFilterDesktop");
