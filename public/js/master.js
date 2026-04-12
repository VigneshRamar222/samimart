import { app } from "/js/firebase-config.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-storage.js";

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

document.getElementById("logoutBtn").addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      console.log("Logged out");
      window.location.href = "login.html";
    })
    .catch((error) => {
      console.error("Logout error:", error);
    });
});

const API_BASE = window.location.origin;
//const API_BASE = "http://localhost:3000";
const ROWS_PER_PAGE = 5;

let categories = [];
let subcategories = [];

const $ = (id) => document.getElementById(id);

const normalize = (str) => str.trim().toLowerCase();

function showLoader() {
  $("loaderOverlay").style.display = "flex";
}

function hideLoader() {
  $("loaderOverlay").style.display = "none";
}

function showToast(message) {
  const toastEl = document.getElementById("appToast");
  const toastBody = toastEl.querySelector(".toast-body");

  toastBody.textContent = message;

  const toast = new bootstrap.Toast(toastEl, {
    delay: 3000, // stays for 3 seconds
  });

  toast.show();
}

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

  if (start > 1) {
    addPage(1);
    if (start > 2) addDots();
  }

  for (let i = start; i <= end; i++) {
    addPage(i);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) addDots();
    addPage(totalPages);
  }

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

async function loadData() {
  try {
    showLoader();

    const catSnap = await getDocs(collection(db, "categories"));
    categories = catSnap.docs.map((doc) => ({
      categoriescode: doc.id,
      ...doc.data(),
    }));

    const subSnap = await getDocs(collection(db, "subcategories"));
    subcategories = subSnap.docs.map((doc) => ({
      SubCategoriesCode: doc.id,
      ...doc.data(),
    }));

    renderCategoriesTable();
    renderSubcategoriesTable();
    renderItemsTable();
    initSearchableSelects();
  } catch (err) {
    console.error(err);
    showToast("Failed to load data");
  } finally {
    hideLoader();
  }
}

function setupSearchableSelect(inputId, dropdownId, items, onChange) {
  const input = $(inputId);
  const dropdown = $(dropdownId);

  let currentIndex = -1;
  let filtered = [];

  input.oninput = () => renderDropdown(input.value);
  input.onfocus = () => renderDropdown(input.value);

  input.onkeydown = (e) => {
    const options = dropdown.querySelectorAll(".dropdown-item");

    if (!options.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      currentIndex = (currentIndex + 1) % options.length;
      highlight(options);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      currentIndex = (currentIndex - 1 + options.length) % options.length;
      highlight(options);
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (currentIndex >= 0) {
        options[currentIndex].click();
      }
    }
  };

  function renderDropdown(filter = "") {
    dropdown.innerHTML = "";
    currentIndex = -1;

    filtered = items.filter((i) =>
      (i.text || "").toLowerCase().includes(filter.toLowerCase()),
    );

    if (!filtered.length) {
      dropdown.classList.remove("show");
      return;
    }

    filtered.forEach((item, index) => {
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

  function highlight(options) {
    options.forEach((el) => el.classList.remove("active"));

    if (currentIndex >= 0) {
      options[currentIndex].classList.add("active");

      options[currentIndex].scrollIntoView({
        block: "nearest",
      });
    }
  }

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove("show");
    }
  });
}

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

function renderCategoriesTable(page = 1, search = "") {
  const tbody = document.querySelector("#categoriesTable tbody");
  tbody.innerHTML = "";

  const filtered = categories.filter((c) =>
    (c.Categories || "").toLowerCase().includes(search),
  );

  const { items, totalPages } = paginate(filtered, page);

  items.forEach((c, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
     <td>${(page - 1) * 5 + index + 1}</td>
     
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

  renderPagination(
    "categoriesPagination",
    totalPages,
    (p) => renderCategoriesTable(p, search),
    page,
  );
}

async function deleteCategory(id) {
  try {
    showLoader();

    const q = query(
      collection(db, "subcategories"),
      where("CategoriesCode", "==", id),
    );

    const subSnap = await getDocs(q);
    const subcategoriesToDelete = subSnap.docs;
    let itemCount = 0;

    for (const sub of subcategoriesToDelete) {
      const data = sub.data();

      if (data.SubImageURL) {
        await deleteImageFromServer(data.SubImageURL);
      }

      await deleteDoc(doc(db, "subcategories", sub.id));
    }

    hideLoader();

    const confirmMsg = `
Delete Category?

This will delete:
- 1 Category
- ${subcategoriesToDelete.length} Subcategories
- ${itemCount} Items
`;

    if (!confirm(confirmMsg)) return;

    showLoader();

    for (const sub of subcategoriesToDelete) {
      await deleteDoc(doc(db, "subcategories", sub.id));
    }

    const category = categories.find((c) => c.categoriescode === id);

    if (category?.ImageURL) {
      await deleteImageFromServer(category.ImageURL);
    }

    await deleteDoc(doc(db, "categories", id));

    showToast("Deleted successfully ✅");
  } catch (err) {
    console.error(err);
    showToast("Delete failed ❌");
  } finally {
    hideLoader();
    loadData();
  }
}

async function deleteImageFromServer(imageUrl) {
  try {
    await fetch(`${API_BASE}/delete-image`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageUrl }),
    });
  } catch (err) {
    console.error("Image delete failed:", err);
  }
}

async function deleteSubcategory(id) {
  try {
    showLoader();

    const subRef = doc(db, "subcategories", id);
    const subSnap = await getDoc(subRef);

    if (!subSnap.exists()) {
      showToast("Subcategory not found ❌");
      return;
    }

    const data = subSnap.data();

    let itemCount = 0;

    if (data.items) {
      const arr = data.items
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      itemCount = arr.length;
    }

    hideLoader();

    const confirmMsg = `
Delete Subcategory?

This will delete:
- 1 Subcategory
- ${itemCount} Items
`;
    if (!confirm(confirmMsg)) return;
    showLoader();
    if (data.SubImageURL) {
      await deleteImageFromServer(data.SubImageURL);
    }
    await deleteDoc(subRef);
    showToast("Subcategory deleted ✅");
  } catch (err) {
    console.error(err);
    showToast("Delete failed ❌");
  } finally {
    hideLoader();
    loadData();
  }
}

async function deleteItem(subId, catId, itemName) {
  try {
    showLoader();

    const subRef = doc(db, "subcategories", subId);
    const subSnap = await getDoc(subRef);

    if (!subSnap.exists()) {
      showToast("Subcategory not found ❌");
      return;
    }

    const data = subSnap.data();

    let itemsArray = [];

    if (data.items) {
      itemsArray = data.items
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    }

    hideLoader();

    const confirmMsg = `
Delete Item?

Item: ${itemName}

Total items in this subcategory: ${itemsArray.length}
`;

    if (!confirm(confirmMsg)) return;

    showLoader();

    const updatedItemsArray = itemsArray.filter(
      (i) => i.toLowerCase() !== itemName.toLowerCase(),
    );

    const updatedItems = updatedItemsArray.join(",");

    await updateDoc(subRef, {
      items: updatedItems,
    });

    showToast("Item deleted ✅");
  } catch (err) {
    console.error(err);
    showToast("Delete failed ❌");
  } finally {
    hideLoader();
    loadData();
  }
}

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

function renderItemsTable(page = 1, search = "") {
  let items = [];

  subcategories.forEach((s) => {
    if (!s.items) return;

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

    tr.querySelector("button").onclick = () =>
      deleteItem(i.subId, i.catId, i.name);

    tbody.appendChild(tr);
  });

  renderPagination(
    "itemsPagination",
    totalPages,
    (p) => renderItemsTable(p, search),
    page,
  );
}

function isDuplicateCategory(name) {
  const normalized = name.trim().toLowerCase();

  return categories.some(
    (c) => (c.Categories || "").trim().toLowerCase() === normalized,
  );
}
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

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  if (!user.emailVerified) {
    alert("Please verify your email first 📧");
    signOut(auth);
    window.location.href = "login.html";
    return;
  }

  if (window._listenersAttached) return;
  window._listenersAttached = true;

  console.log("User authenticated:", user.email);
  loadData();

  $("saveCategoryBtn").addEventListener("click", async function (e) {
    e.preventDefault();

    const name = $("catName").value.trim();
    const file = $("catImage").files[0];

    if (!name || !file) {
      showToast("Fill all fields");
      return;
    }

    if (isDuplicateCategory(name)) {
      showToast("Category already exists ⚠️");
      return;
    }
    const formData = new FormData();
    formData.append("image", file);

    try {
      showLoader();
      const res = await fetch(`${API_BASE}/upload-category`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        //console.error(await res.text());
        showToast("Upload failed");
        return;
      }

      const data = await res.json();
      const imageUrl = data.imageUrl;

      await addDoc(collection(db, "categories"), {
        Categories: name,
        ImageURL: imageUrl,
      });
      hideLoader();

      $("catName").value = "";
      $("catImage").value = "";
      loadData();
      showToast("Category added ✅");
    } catch (err) {
      hideLoader();
      console.error("CATCH ERROR:", err);
      showToast("Error ❌");
    } finally {
      hideLoader();
    }
  });

  $("saveSubCategoryBtn").addEventListener("click", async function (e) {
    e.preventDefault();

    const name = $("subName").value.trim();
    const categoryId = $("subCatParentInput").dataset.value;
    const file = $("subImage").files[0];

    if (!name || !categoryId || !file) {
      showToast("Fill all fields");
      return;
    }

    if (!isValidCategoryId(categoryId)) {
      showToast("Please select valid category");
      return;
    }

    if (isDuplicateSubcategory(name, categoryId)) {
      showToast("Subcategory already exists ⚠️");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".webp")) {
      showToast("Only .webp files allowed");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      showLoader();

      const res = await fetch(`${API_BASE}/upload-category`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        console.error(await res.text());
        showToast("Image upload failed ❌");
        return;
      }

      const data = await res.json();
      const imageUrl = data.imageUrl;

      await addDoc(collection(db, "subcategories"), {
        SubCategories: name,
        CategoriesCode: categoryId,
        SubImageURL: imageUrl,
        items: "", // initialize
      });

      $("subName").value = "";
      $("subImage").value = "";
      $("subCatParentInput").value = "";
      $("subCatParentInput").dataset.value = "";

      showToast("Subcategory added ✅");
    } catch (err) {
      console.error(err);
      showToast("Error saving subcategory ❌");
    } finally {
      hideLoader();
      loadData();
    }
  });

  $("saveItemBtn").addEventListener("click", async function (e) {
    e.preventDefault();

    const name = $("itemName").value.trim();
    const catId = $("itemCatParentInput").dataset.value;
    const subId = $("itemSubParentInput").dataset.value;

    if (!name || !catId || !subId) {
      showToast("Fill all fields");
      return;
    }

    if (!isValidCategoryId(catId)) {
      showToast("Invalid category");
      return;
    }

    if (!isValidSubcategoryId(subId, catId)) {
      showToast("Invalid subcategory");
      return;
    }

    if (isDuplicateItem(name, subId, catId)) {
      showToast("Item already exists ⚠️");
      return;
    }

    try {
      showLoader();

      const subRef = doc(db, "subcategories", subId);
      const subSnap = await getDoc(subRef);

      if (!subSnap.exists()) {
        showToast("Subcategory not found ❌");
        return;
      }

      const data = subSnap.data();

      let itemsArray = [];

      if (data.items) {
        itemsArray = data.items
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
      }

      itemsArray.push(name);

      const updatedItems = itemsArray.join(",");

      await updateDoc(subRef, {
        items: updatedItems,
      });

      $("itemName").value = "";
      $("itemCatParentInput").value = "";
      $("itemCatParentInput").dataset.value = "";
      $("itemSubParentInput").value = "";
      $("itemSubParentInput").dataset.value = "";

      showToast("Item added");
    } catch (err) {
      console.error(err);
      showToast("Error adding item");
    } finally {
      hideLoader();
      loadData();
    }
  });

  $("categoriesSearch").oninput = (e) =>
    renderCategoriesTable(1, normalize(e.target.value));

  $("subcategoriesSearch").oninput = (e) =>
    renderSubcategoriesTable(1, normalize(e.target.value));

  $("itemsSearch").oninput = (e) =>
    renderItemsTable(1, normalize(e.target.value));
});
