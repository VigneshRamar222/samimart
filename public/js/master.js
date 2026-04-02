//window.onbeforeunload = () => console.log("PAGE RELOADING...");
// ===================== CONFIG =====================
const API_BASE = "http://localhost:3000/api";
//const API_BASE = `${process.env.BASE_URL}/api`;
const ROWS_PER_PAGE = 5;

let categories = [];
let subcategories = [];

// ===================== HELPERS =====================
const $ = (id) => document.getElementById(id);

const normalize = (str) => str.trim().toLowerCase();

// -------------------- TOAST --------------------

function showToast(message) {
  const toastEl = document.getElementById("appToast");
  const toastBody = toastEl.querySelector(".toast-body");

  toastBody.textContent = message;

  const toast = new bootstrap.Toast(toastEl, {
    delay: 3000, // stays for 3 seconds
  });

  toast.show();
}

// -------------------- PAGINATION --------------------
function paginate(array, page = 1) {
  const start = (page - 1) * ROWS_PER_PAGE;
  return {
    items: array.slice(start, start + ROWS_PER_PAGE),
    totalPages: Math.ceil(array.length / ROWS_PER_PAGE) || 1,
  };
}
function renderPagination(containerId, totalPages, onClick, currentPage = 1) {
  const ul = $(containerId);
  ul.innerHTML = "";

  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = start + maxVisible - 1;

  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - maxVisible + 1);
  }

  // ---------- PREVIOUS ----------
  const prevLi = document.createElement("li");
  prevLi.className = `page-item ${currentPage === 1 ? "disabled" : ""}`;

  const prevBtn = document.createElement("button");
  prevBtn.className = "page-link";
  prevBtn.innerHTML = "&laquo;";

  prevBtn.onclick = () => {
    if (currentPage > 1) onClick(currentPage - 1);
  };

  prevLi.appendChild(prevBtn);
  ul.appendChild(prevLi);

  // ---------- FIRST + DOTS ----------
  if (start > 1) {
    addPage(1);
    if (start > 2) addDots();
  }

  // ---------- MIDDLE PAGES ----------
  for (let i = start; i <= end; i++) {
    addPage(i);
  }

  // ---------- LAST + DOTS ----------
  if (end < totalPages) {
    if (end < totalPages - 1) addDots();
    addPage(totalPages);
  }

  // ---------- NEXT ----------
  const nextLi = document.createElement("li");
  nextLi.className = `page-item ${currentPage === totalPages ? "disabled" : ""}`;

  const nextBtn = document.createElement("button");
  nextBtn.className = "page-link";
  nextBtn.innerHTML = "&raquo;";

  nextBtn.onclick = () => {
    if (currentPage < totalPages) onClick(currentPage + 1);
  };

  nextLi.appendChild(nextBtn);
  ul.appendChild(nextLi);

  // ---------- HELPERS ----------
  function addPage(page) {
    const li = document.createElement("li");
    li.className = `page-item ${page === currentPage ? "active" : ""}`;

    const btn = document.createElement("button");
    btn.className = "page-link";
    btn.textContent = page;

    btn.onclick = () => onClick(page);

    li.appendChild(btn);
    ul.appendChild(li);
  }

  function addDots() {
    const li = document.createElement("li");
    li.className = "page-item disabled";

    const span = document.createElement("span");
    span.className = "page-link";
    span.textContent = "...";

    li.appendChild(span);
    ul.appendChild(li);
  }
}

// ===================== LOAD DATA =====================
async function loadData() {
  const [catRes, subRes] = await Promise.all([
    fetch(`${API_BASE}/categories`),
    fetch(`${API_BASE}/subcategories`),
  ]);

  const catData = await catRes.json();
  const subData = await subRes.json();

  // Always convert to array
  categories = Array.isArray(catData)
    ? catData
    : Array.isArray(catData.data)
      ? catData.data
      : [];

  subcategories = Array.isArray(subData)
    ? subData
    : Array.isArray(subData.data)
      ? subData.data
      : [];

  //console.log("categories:", categories);
  //console.log("subcategories:", subcategories);

  renderCategoriesTable();
  renderSubcategoriesTable();
  renderItemsTable();
  initSearchableSelects();
}

// ===================== DROPDOWN =====================
function setupSearchableSelect(inputId, dropdownId, items, onChange) {
  const input = $(inputId);
  const dropdown = $(dropdownId);

  input.oninput = () => renderDropdown(input.value);
  input.onfocus = () => renderDropdown(input.value);

  function renderDropdown(filter = "") {
    dropdown.innerHTML = "";

    // const filtered = items.filter((i) =>
    //   i.text.toLowerCase().includes(filter.toLowerCase()),
    // );

    const filtered = items.filter((i) =>
      (i.text || "").toLowerCase().includes(filter.toLowerCase()),
    );

    if (!filtered.length) {
      dropdown.classList.remove("show");
      return;
    }

    filtered.forEach((item) => {
      const div = document.createElement("div");
      div.className = "dropdown-item";
      div.textContent = item.text;

      div.onclick = () => {
        input.value = item.text;
        input.dataset.value = item.value;
        dropdown.classList.remove("show");

        if (onChange) onChange(item);
      };

      dropdown.appendChild(div);
    });

    dropdown.classList.add("show");
  }

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove("show");
    }
  });
}

// ===================== INIT DROPDOWNS =====================
function initSearchableSelects() {
  const catItems = categories.map((c) => ({
    value: c.categoriescode,
    text: c.Categories,
  }));

  setupSearchableSelect("subCatParentInput", "subCatParentDropdown", catItems);

  setupSearchableSelect(
    "itemCatParentInput",
    "itemCatParentDropdown",
    catItems,
    (selected) => {
      const subItems = subcategories
        .filter((s) => s.CategoriesCode == selected.value)
        .map((s) => ({
          value: s.SubCategoriesCode,
          text: s.SubCategories,
        }));

      $("itemSubParentInput").value = "";
      $("itemSubParentInput").dataset.value = "";

      setupSearchableSelect(
        "itemSubParentInput",
        "itemSubParentDropdown",
        subItems,
      );
    },
  );
}

// ===================== TABLES =====================

// -------- Categories --------
// -------- Categories --------
function renderCategoriesTable(page = 1, search = "") {
  const tbody = document.querySelector("#categoriesTable tbody");
  tbody.innerHTML = "";

  // Filter
  const filtered = categories.filter((c) =>
    (c.Categories || "").toLowerCase().includes(search),
  );

  // Pagination
  const { items, totalPages } = paginate(filtered, page);

  // Render rows
  items.forEach((c, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
     <td>${(page - 1) * 5 + index + 1}</td>
      <td>${c.categoriescode}</td>
      <td>${c.Categories}</td>
      <td>
        <img src="${c.ImageURL}" width="60" height="60"
        style="object-fit:cover;border-radius:6px;">
      </td>
      <td>
        <button class="btn btn-sm btn-danger">Delete</button>
      </td>
    `;

    tr.querySelector("button").onclick = () => deleteCategory(c.categoriescode);

    tbody.appendChild(tr);
  });

  // Render pagination buttons
  renderPagination(
    "categoriesPagination",
    totalPages,
    (p) => renderCategoriesTable(p, search),
    page,
  );
}

// -------- Subcategories --------
function renderSubcategoriesTable(page = 1, search = "") {
  const filtered = subcategories.filter((s) =>
    (s.SubCategories || "").toLowerCase().includes(search),
  );

  const { items, totalPages } = paginate(filtered, page);
  const tbody = document.querySelector("#subcategoriesTable tbody");
  tbody.innerHTML = "";

  items.forEach((s, index) => {
    const catName =
      categories.find((c) => c.categoriescode === s.CategoriesCode)
        ?.Categories || "";

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${(page - 1) * 5 + index + 1}</td>
      <td>${s.SubCategories}</td>
      <td>${catName}</td>
       <td>
        <img src="${s.SubImageURL}" width="60" height="60"
        style="object-fit:cover;border-radius:6px;">
      </td>
      <td>
        <button class="btn btn-danger btn-sm">Delete</button>
      </td>
    `;

    tr.querySelector("button").onclick = () =>
      deleteSubcategory(s.SubCategoriesCode);

    tbody.appendChild(tr);
  });

  renderPagination(
    "subcategoriesPagination",
    totalPages,
    (p) => renderSubcategoriesTable(p, search),
    page,
  );
}

// -------- Items --------
function renderItemsTable(page = 1, search = "") {
  let items = [];

  subcategories.forEach((s) => {
    if (!s.items) return;

    // Convert string to array
    //const itemArray = s.items.split(",");
    const itemArray = s.items
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    itemArray.forEach((i) =>
      items.push({
        name: i.trim(),
        subId: s.SubCategoriesCode,
        subName: s.SubCategories,
        catId: s.CategoriesCode,
      }),
    );
  });

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search));

  const { items: paged, totalPages } = paginate(filtered, page);

  const tbody = document.querySelector("#itemsTable tbody");
  tbody.innerHTML = "";

  paged.forEach((i, index) => {
    const catName =
      categories.find((c) => c.categoriescode === i.catId)?.Categories || "";

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${(page - 1) * 5 + index + 1}</td>
      <td>${i.name}</td>
      <td>${catName}</td>
      <td>${i.subName}</td>
      <td>
        <button class="btn btn-danger btn-sm">Delete</button>
      </td>
    `;

    //tr.querySelector("button").onclick = () => deleteItem(i.subId, i.name);
    tr.querySelector("button").onclick = () =>
      deleteItem(i.subId, i.catId, i.name);

    tbody.appendChild(tr);
  });

  // renderPagination("itemsPagination", totalPages, (p) =>
  //   renderItemsTable(p, search),
  // );

  renderPagination(
    "itemsPagination",
    totalPages,
    (p) => renderItemsTable(p, search),
    page,
  );
}

// ===================== SAVE =====================

function isDuplicateCategory(name) {
  const normalized = name.trim().toLowerCase();

  return categories.some(
    (c) => (c.Categories || "").trim().toLowerCase() === normalized,
  );
}

// -------- Category --------
$("saveCategoryBtn").onclick = async (e) => {
  const name = $("catName").value.trim();
  const file = $("catImage").files[0];

  if (!file) {
    showToast("Please select an image");
    return;
  }

  // Check file extension
  if (!file.name.toLowerCase().endsWith(".webp")) {
    showToast("Only .webp files are allowed");
    $("catImage").value = ""; // clear selected file
    return;
  }

  if (!name || !file) return showToast("Fill all fields");

  if (isDuplicateCategory(name)) {
    showToast("Category already exists");
    $("catName").focus(); // nice UX
    return;
  }

  const formData = new FormData();
  formData.append("name", name);
  formData.append("image", file);

  const res = await fetch(`${API_BASE}/categories`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    //alert(data.msg);
    showToast(data.msg || "Error found");
    $("catName").focus();
    return;
  }

  showToast("Category added");

  $("catName").value = "";
  $("catImage").value = "";

  loadData();
};

// -------- Subcategory --------

function isDuplicateSubcategory(name, categoryId) {
  const normalized = name.trim().toLowerCase();

  return subcategories.some(
    (s) =>
      (s.SubCategories || "").trim().toLowerCase() === normalized &&
      String(s.CategoriesCode) === String(categoryId),
  );
}
function isValidCategoryId(categoryId) {
  return categories.some(
    (c) => String(c.categoriescode) === String(categoryId),
  );
}
$("saveSubCategoryBtn").onclick = async () => {
  const name = $("subName").value.trim();
  const categoryId = $("subCatParentInput").dataset.value;
  const file = $("subImage").files[0];

  if (!isValidCategoryId(categoryId)) {
    showToast("Please select a valid category");
    return;
  }

  if (!file) {
    showToast("Please select an image");
    return;
  }

  // Check file extension
  if (!file.name.toLowerCase().endsWith(".webp")) {
    showToast("Only .webp files are allowed");
    $("catImage").value = ""; // clear selected file
    return;
  }

  if (!name || !categoryId || !file) {
    return showToast("Fill all fields");
  }

  if (isDuplicateSubcategory(name, categoryId)) {
    showToast("Subcategory already exists in this category");
    return;
  }

  const formData = new FormData();
  formData.append("name", name);
  formData.append("categoryId", categoryId);
  formData.append("image", file);

  try {
    const res = await fetch(`${API_BASE}/subcategories`, {
      method: "POST",
      body: formData,
    });
    console.log("STATUS:", res.status);
    console.log("TEXT:", await res.text());

    if (!res.ok) throw new Error("Failed to save");

    $("subName").value = "";
    $("subImage").value = "";
    $("subCatParentInput").value = "";
    $("subCatParentInput").dataset.value = "";

    showToast("Subcategory added successfully");
    loadData();
  } catch (err) {
    showToast("Error saving subcategory");
    console.error(err);
  }
};

// -------- Item --------

function isValidSubcategoryId(subId, catId) {
  return subcategories.some(
    (s) =>
      String(s.SubCategoriesCode) === String(subId) &&
      String(s.CategoriesCode) === String(catId),
  );
}

function isDuplicateItem(name, subId, catId) {
  const sub = subcategories.find(
    (s) =>
      String(s.SubCategoriesCode) === String(subId) &&
      String(s.CategoriesCode) === String(catId),
  );

  if (!sub || !sub.items) return false;

  return sub.items
    .split(",")
    .map((i) => i.trim().toLowerCase())
    .includes(name.trim().toLowerCase());
}

$("saveItemBtn").onclick = async () => {
  //alert("hi");
  const name = $("itemName").value.trim();
  const catId = $("itemCatParentInput").dataset.value;
  const subId = $("itemSubParentInput").dataset.value;

  if (!isValidCategoryId(catId)) return showToast("Select a valid category");
  if (!isValidSubcategoryId(subId, catId))
    return showToast("Select a valid subcategory for the category");

  //alert("hi");
  if (!name || !subId) return showToast("Fill all fields");

  if (isDuplicateItem(name, subId, catId))
    return showToast("Item already exists in this category + subcategory");
  try {
    const res = await fetch(`${API_BASE}/subcategories/${subId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) return showToast("Failed to add item");

    $("itemName").value = "";
    $("itemSubParentInput").value = "";
    $("itemSubParentInput").dataset.value = "";
    $("itemCatParentInput").value = "";
    $("itemCatParentInput").dataset.value = "";

    showToast("Item added");
    loadData();
  } catch (err) {
    console.error(err);
    showToast("Error adding item");
  }
};

// ===================== DELETE =====================
async function deleteCategory(id) {
  if (!confirm("Delete category?")) return;

  await fetch(`${API_BASE}/categories/${id}`, { method: "DELETE" });

  showToast("Deleted");
  loadData();
}

async function deleteSubcategory(id) {
  if (!confirm("Delete subcategory?")) return;

  await fetch(`${API_BASE}/subcategories/${id}`, { method: "DELETE" });

  showToast("Deleted");
  loadData();
}

async function deleteItem(subId, catId, itemName) {
  if (!confirm(`Delete item: ${itemName}?`)) return;

  try {
    await fetch(
      `${API_BASE}/subcategories/${subId}/${catId}/${encodeURIComponent(itemName)}`,
      {
        method: "DELETE",
      },
    );

    showToast("Item deleted successfully");
    loadData();
  } catch (err) {
    console.error(err);
    alert("Delete failed");
  }
}

// ===================== SEARCH =====================
$("categoriesSearch").oninput = (e) =>
  renderCategoriesTable(1, normalize(e.target.value));

$("subcategoriesSearch").oninput = (e) =>
  renderSubcategoriesTable(1, normalize(e.target.value));

$("itemsSearch").oninput = (e) =>
  renderItemsTable(1, normalize(e.target.value));

// ===================== INIT =====================
loadData();
