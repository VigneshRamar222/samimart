const API_BASE = "http://localhost:3000/api";
const ROWS_PER_PAGE = 5;

let categories = [];
let subcategories = [];

const normalize = (str) => str.trim().toLowerCase();

// -------------------- TOAST --------------------
function showToast(message) {
  const toastEl = document.getElementById("appToast");
  toastEl.querySelector(".toast-body").textContent = message;
  new bootstrap.Toast(toastEl).show();
}

// -------------------- LOAD DATA --------------------
async function loadData() {
  categories = await fetch(`${API_BASE}/categories`).then((r) => r.json());
  subcategories = await fetch(`${API_BASE}/subcategories`).then((r) =>
    r.json(),
  );

  renderCategoriesTable();
  renderSubcategoriesTable();
  renderItemsTable();
  initSearchableSelects();
}

// -------------------- DROPDOWN --------------------
function setupSearchableSelect(inputId, dropdownId, items, onChange) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  let highlightedIndex = -1;

  function renderDropdown(filter = "") {
    dropdown.innerHTML = "";

    const filtered = items.filter((i) =>
      i.text.toLowerCase().includes(filter.toLowerCase()),
    );

    if (!filtered.length) {
      dropdown.classList.remove("show");
      return;
    }

    filtered.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "dropdown-item";
      div.textContent = item.text;

      if (index === highlightedIndex) div.classList.add("active");

      div.onclick = () => {
        input.value = item.text;
        input.dataset.value = item.value;
        dropdown.classList.remove("show");

        input.dispatchEvent(new Event("change"));
        if (onChange) onChange(item);
      };

      dropdown.appendChild(div);
    });

    dropdown.classList.add("show");
  }

  input.oninput = () => {
    highlightedIndex = -1;
    renderDropdown(input.value);
  };

  input.onfocus = () => renderDropdown(input.value);

  input.onkeydown = (e) => {
    const filtered = items.filter((i) =>
      i.text.toLowerCase().includes(input.value.toLowerCase()),
    );

    if (!filtered.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlightedIndex = (highlightedIndex + 1) % filtered.length;
      renderDropdown(input.value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlightedIndex =
        (highlightedIndex - 1 + filtered.length) % filtered.length;
      renderDropdown(input.value);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0) {
        const selected = filtered[highlightedIndex];
        input.value = selected.text;
        input.dataset.value = selected.value;
        dropdown.classList.remove("show");

        input.dispatchEvent(new Event("change"));
        if (onChange) onChange(selected);
      }
    }
  };

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove("show");
    }
  });
}

// -------------------- INIT DROPDOWNS --------------------
function initSearchableSelects() {
  const catItems = categories.map((c) => ({
    value: c.id,
    text: c.name,
  }));

  setupSearchableSelect("subCatParentInput", "subCatParentDropdown", catItems);

  setupSearchableSelect(
    "itemCatParentInput",
    "itemCatParentDropdown",
    catItems,
    (selected) => {
      const subItems = subcategories
        .filter((s) => s.categoryId === selected.value)
        .map((s) => ({ value: s.id, text: s.name }));

      document.getElementById("itemSubParentInput").value = "";
      document.getElementById("itemSubParentInput").dataset.value = "";

      setupSearchableSelect(
        "itemSubParentInput",
        "itemSubParentDropdown",
        subItems,
      );
    },
  );
}

// -------------------- PAGINATION --------------------
function paginate(array, page = 1) {
  const start = (page - 1) * ROWS_PER_PAGE;
  return {
    items: array.slice(start, start + ROWS_PER_PAGE),
    totalPages: Math.ceil(array.length / ROWS_PER_PAGE) || 1,
  };
}

// -------------------- TABLES --------------------
function renderCategoriesTable(page = 1, search = "") {
  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search),
  );

  const { items, totalPages } = paginate(filtered, page);
  const tbody = document.querySelector("#categoriesTable tbody");
  tbody.innerHTML = "";

  renderPagination("categoriesPagination", totalPages, (p) =>
    renderCategoriesTable(p, search),
  );

  items.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.name}</td>
      <td>
        <button class="btn btn-danger btn-sm">Delete</button>
      </td>`;

    tr.querySelector("button").onclick = () => deleteCategory(c.id);
    tbody.appendChild(tr);
  });
}

function renderPagination(containerId, totalPages, onPageClick) {
  const ul = document.getElementById(containerId);
  ul.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement("li");
    li.className = "page-item";

    const btn = document.createElement("button");
    btn.className = "page-link";
    btn.textContent = i;

    btn.onclick = () => onPageClick(i);

    li.appendChild(btn);
    ul.appendChild(li);
  }
}

function renderSubcategoriesTable(page = 1, search = "") {
  const filtered = subcategories.filter((s) =>
    s.name.toLowerCase().includes(search),
  );

  const { items } = paginate(filtered, page);
  const tbody = document.querySelector("#subcategoriesTable tbody");
  tbody.innerHTML = "";

  items.forEach((s) => {
    const catName = categories.find((c) => c.id === s.categoryId)?.name || "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.id}</td>
      <td>${s.name}</td>
      <td>${catName}</td>
      <td><button class="btn btn-danger btn-sm">Delete</button></td>
    `;

    tr.querySelector("button").onclick = () => deleteSubcategory(s.id);
    tbody.appendChild(tr);
  });
}

function renderItemsTable(page = 1, search = "") {
  let items = [];

  subcategories.forEach((s) => {
    (s.items || []).forEach((i) =>
      items.push({
        name: i,
        subId: s.id,
        subName: s.name,
        catId: s.categoryId,
      }),
    );
  });

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search));

  const { items: paged } = paginate(filtered, page);
  const tbody = document.querySelector("#itemsTable tbody");
  tbody.innerHTML = "";

  paged.forEach((i) => {
    const catName = categories.find((c) => c.id === i.catId)?.name || "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i.name}</td>
      <td>${catName}</td>
      <td>${i.subName}</td>
      <td><button class="btn btn-danger btn-sm">Delete</button></td>
    `;

    tr.querySelector("button").onclick = () => deleteItem(i.subId, i.name);

    tbody.appendChild(tr);
  });
}

// -------------------- SAVE --------------------
document.getElementById("saveCategoryBtn").onclick = async () => {
  const name = document.getElementById("catName").value.trim();
  const file = document.getElementById("catImage").files[0];

  if (!name || !file) return showToast("Fill all fields");

  const formData = new FormData();
  formData.append("name", name);
  formData.append("image", file);

  await fetch(`${API_BASE}/categories`, {
    method: "POST",
    body: formData,
  });

  showToast("Category added");
  document.getElementById("catName").value = "";
  document.getElementById("catImage").value = "";
  loadData();
};

document.getElementById("saveSubCategoryBtn").onclick = async () => {
  const name = document.getElementById("subName").value.trim();
  const categoryId = parseInt(
    document.getElementById("subCatParentInput").dataset.value,
  );

  const file = document.getElementById("subImage").files[0];

  if (!name || !categoryId || !file) return showToast("Fill all fields");

  const formData = new FormData();
  formData.append("name", name);
  formData.append("categoryId", categoryId);
  formData.append("image", file);

  await fetch(`${API_BASE}/subcategories`, {
    method: "POST",
    body: formData,
  });

  // await fetch(`${API_BASE}/subcategories`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ name, categoryId }),
  // });

  showToast("Subcategory added");
  loadData();
};

document.getElementById("saveItemBtn").onclick = async () => {
  const name = document.getElementById("itemName").value.trim();
  const subId = parseInt(
    document.getElementById("itemSubParentInput").dataset.value,
  );

  if (!name || !subId) return showToast("Fill all fields");

  await fetch(`${API_BASE}/subcategories/${subId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  showToast("Item added");
  loadData();
};

// -------------------- DELETE --------------------
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

async function deleteItem(subId, name) {
  if (!confirm("Delete item?")) return;

  await fetch(`${API_BASE}/subcategories/${subId}/items`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  showToast("Deleted");
  loadData();
}

// -------------------- SEARCH --------------------
document.getElementById("categoriesSearch").oninput = (e) =>
  renderCategoriesTable(1, e.target.value.toLowerCase());

document.getElementById("subcategoriesSearch").oninput = (e) =>
  renderSubcategoriesTable(1, e.target.value.toLowerCase());

document.getElementById("itemsSearch").oninput = (e) =>
  renderItemsTable(1, e.target.value.toLowerCase());

// -------------------- INIT --------------------
loadData();
