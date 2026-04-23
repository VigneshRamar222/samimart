import { db } from "/public/js/firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { updateCartCount } from "/js/main.js";

updateCartCount();

const isLocalHost =
  ["localhost", "127.0.0.1"].includes(window.location.hostname) ||
  window.location.hostname.startsWith("192.168.") ||
  window.location.hostname.startsWith("10.") ||
  window.location.hostname.startsWith("172.");

const API_BASE = isLocalHost
  ? "http://localhost:3000"
  : `${window.location.origin}/api`;

function setCartLoadingState(show) {
  const loader = document.getElementById("cartLoader");
  const empty  = document.getElementById("emptyCartSection");
  const items  = document.getElementById("cartItemsSection");
  loader && loader.classList.toggle("is-hidden", !show);
  if (show) {
    empty?.classList.add("d-none");
    items?.classList.add("d-none");
  }
}

async function loadSubcategoriesWithCategoryNames() {
  const subSnap = await getDocs(collection(db, "subcategories"));
  const catSnap = await getDocs(collection(db, "categories"));
  const catMap  = {};
  catSnap.docs.forEach(d => { catMap[d.id] = d.data().Categories || ""; });
  return subSnap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    Categories: catMap[d.data().CategoriesCode] || ""
  }));
}

document.getElementById("year").textContent = new Date().getFullYear();


function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function refreshCheckAll(cardEl) {
  const boxes   = cardEl.querySelectorAll(".item-checkbox");
  const checked = cardEl.querySelectorAll(".item-checkbox:checked");
  const btn     = cardEl.querySelector(".btn-check-all");
  if (!btn) return;
  const allChecked = boxes.length > 0 && checked.length === boxes.length;
  btn.textContent  = allChecked ? "Uncheck All" : "Check All";
}

async function renderCart() {
  setCartLoadingState(true);

  const cart        = getCart();
  const emptyEl     = document.getElementById("emptyCartSection");
  const sectionEl   = document.getElementById("cartItemsSection");
  const containerEl = document.getElementById("cartItems");

  if (cart.length === 0) {
    emptyEl?.classList.remove("d-none");
    sectionEl?.classList.add("d-none");
    setCartLoadingState(false);
    return;
  }

  try {
    emptyEl?.classList.add("d-none");
    sectionEl?.classList.remove("d-none");
    containerEl.innerHTML = "";

    const subcategories = await loadSubcategoriesWithCategoryNames();

    cart.forEach((entry, cartIndex) => {
      const subcat = subcategories.find(
        s => String(s.CategoriesCode) === String(entry.CategoriesCode) &&
             String(s.id)            === String(entry.SubCategoriesCode)
      );

      const imgSrc    = subcat?.SubImageURL || "/assets/images/categories/noitemfound.jpg";
      const subcatName = subcat?.SubCategories || "-";
      const itemsHTML = entry.items.map((item, itemIndex) => {
        const displayName = item.remark?.trim()
          ? `${item.name} <span class="text-muted">(${item.remark})</span>`
          : item.name;

        return `
<li class="list-group-item px-3 py-2" id="item-row-${cartIndex}-${itemIndex}">
  <div class="d-flex align-items-center gap-2">
    <input type="checkbox"
           class="form-check-input item-checkbox flex-shrink-0"
           data-cart="${cartIndex}"
           data-item="${itemIndex}">
    <span class="item-name flex-grow-1 small text-capitalize">${displayName}</span>
    <button class="btn btn-sm btn-outline-secondary py-0 px-2 btn-edit-remark"
            data-cart="${cartIndex}"
            data-item="${itemIndex}"
            title="Edit remark">
      <i class="bi bi-pencil"></i>
    </button>
  </div>
  <div class="remark-editor mt-2 d-none" id="remark-editor-${cartIndex}-${itemIndex}">
    <input type="text"
           class="form-control form-control-sm mb-1 remark-input"
           placeholder="Enter remark…"
           value="${item.remark || ""}">
    <div class="d-flex gap-2">
      <button class="btn btn-sm btn-primary btn-submit-remark"
              data-cart="${cartIndex}"
              data-item="${itemIndex}">
        <i class="bi bi-check-lg"></i> Save
      </button>
      <button class="btn btn-sm btn-secondary btn-cancel-remark"
              data-cart="${cartIndex}"
              data-item="${itemIndex}">
        Cancel
      </button>
    </div>
  </div>
</li>`;
      }).join("");

      const colEl = document.createElement("div");
      colEl.className = "col-lg-3 col-md-4 col-sm-6 mb-4";
      colEl.innerHTML = `
<div class="card h-100 border-0 shadow-sm cart-card" id="cart-card-${cartIndex}">

  <!-- image -->
  <div class="text-center p-3 bg-light">
    <img src="${imgSrc}"
         alt="${subcatName}"
         class="img-fluid"
         style="height:120px; object-fit:contain;">
  </div>
  <div class="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-2 px-3">
    <h6 class="mb-0 fw-bold text-capitalize small">${subcatName}</h6>
    <button class="btn btn-sm btn-outline-primary py-0 px-2 btn-check-all"
            data-cart="${cartIndex}">Check All</button>
  </div>
  <ul class="list-group list-group-flush flex-grow-1" id="items-list-${cartIndex}">
    ${itemsHTML}
  </ul>
  <div class="card-footer bg-white border-top text-center py-2">
    <button class="btn btn-sm btn-danger btn-remove-checked"
            data-cart="${cartIndex}">
      <i class="bi bi-trash"></i> Remove
    </button>
  </div>

</div>`;

      containerEl.appendChild(colEl);
    });
    attachEvents();
  } catch (err) {
    console.error("Cart load failed:", err);
    document.getElementById("emptyCartSection")?.classList.remove("d-none");
    document.getElementById("cartItemsSection")?.classList.add("d-none");
  } finally {
    setCartLoadingState(false);
  }
}
function attachEvents() {
  document.querySelectorAll(".item-checkbox").forEach(cb => {
    cb.addEventListener("change", () => {
      const card = document.getElementById(`cart-card-${cb.dataset.cart}`);
      refreshCheckAll(card);
    });
  });
  document.querySelectorAll(".btn-check-all").forEach(btn => {
    btn.addEventListener("click", () => {
      const card    = document.getElementById(`cart-card-${btn.dataset.cart}`);
      const boxes   = card.querySelectorAll(".item-checkbox");
      const checked = card.querySelectorAll(".item-checkbox:checked");
      const allChecked = boxes.length > 0 && checked.length === boxes.length;
      boxes.forEach(cb => { cb.checked = !allChecked; });
      refreshCheckAll(card);
    });
  });
  document.querySelectorAll(".btn-edit-remark").forEach(btn => {
    btn.addEventListener("click", () => {
      const editorId = `remark-editor-${btn.dataset.cart}-${btn.dataset.item}`;
      document.getElementById(editorId)?.classList.remove("d-none");
      btn.classList.add("d-none");
    });
  });
  document.querySelectorAll(".btn-cancel-remark").forEach(btn => {
    btn.addEventListener("click", () => {
      const editorId = `remark-editor-${btn.dataset.cart}-${btn.dataset.item}`;
      const editor   = document.getElementById(editorId);
      if (editor) {
        /* restore original value */
        const cart = getCart();
        const originalRemark = cart[btn.dataset.cart]?.items[btn.dataset.item]?.remark || "";
        editor.querySelector(".remark-input").value = originalRemark;
        editor.classList.add("d-none");
      }
      const editBtn = document.querySelector(
        `.btn-edit-remark[data-cart="${btn.dataset.cart}"][data-item="${btn.dataset.item}"]`
      );
      editBtn?.classList.remove("d-none");
    });
  });
  document.querySelectorAll(".btn-submit-remark").forEach(btn => {
    btn.addEventListener("click", () => {
      const ci     = parseInt(btn.dataset.cart);
      const ii     = parseInt(btn.dataset.item);
      const editor = document.getElementById(`remark-editor-${ci}-${ii}`);
      const newRemark = editor.querySelector(".remark-input").value.trim();

      const cart = getCart();
      if (cart[ci]?.items[ii]) {
        cart[ci].items[ii].remark = newRemark;
        saveCart(cart);
      }
      const nameSpan   = document.querySelector(`#item-row-${ci}-${ii} .item-name`);
      const itemName   = cart[ci].items[ii].name;
      nameSpan.innerHTML = newRemark
        ? `${itemName} <span class="text-muted">(${newRemark})</span>`
        : itemName;

      editor.classList.add("d-none");
      const editBtn = document.querySelector(
        `.btn-edit-remark[data-cart="${ci}"][data-item="${ii}"]`
      );
      editBtn?.classList.remove("d-none");
    });
  });
  document.querySelectorAll(".btn-remove-checked").forEach(btn => {
    btn.addEventListener("click", () => {
      const ci      = parseInt(btn.dataset.cart);
      const card    = document.getElementById(`cart-card-${ci}`);
      const checked = card.querySelectorAll(".item-checkbox:checked");

      if (checked.length === 0) {
        alert("Please check at least one item to remove.");
        return;
      }
      const indices = Array.from(checked)
        .map(cb => parseInt(cb.dataset.item))
        .sort((a, b) => b - a);

      const cart = getCart();
      indices.forEach(ii => { cart[ci].items.splice(ii, 1); });

      if (cart[ci].items.length === 0) cart.splice(ci, 1);

      saveCart(cart);
      location.reload();
    });
  });
}
document.addEventListener("DOMContentLoaded", renderCart);
function saveUserDetails(userName, contactNo, email) {
  localStorage.setItem("enquiryUserDetails", JSON.stringify({ userName, contactNo, email }));
}

function autoFillUserDetails() {
  const saved = JSON.parse(localStorage.getItem("enquiryUserDetails") || "null");
  if (!saved) return;
  const userNameEl  = document.getElementById("userName");
  const contactNoEl = document.getElementById("contactNo");
  const emailEl     = document.getElementById("email");
  if (userNameEl  && saved.userName)  userNameEl.value  = saved.userName;
  if (contactNoEl && saved.contactNo) contactNoEl.value = saved.contactNo;
  if (emailEl     && saved.email)     emailEl.value     = saved.email;
}

const enquiryModalEl = document.getElementById("enquiryModal");
enquiryModalEl && enquiryModalEl.addEventListener("show.bs.modal", autoFillUserDetails);

const enquiryForm = document.getElementById("enquiryForm");
enquiryForm && enquiryForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const submitBtn     = document.getElementById("enquiryFormSubmit");
  const originalLabel = submitBtn.innerHTML;

  submitBtn.classList.add("btn-loading");
  submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sending...';

  const cart = getCart();
  if (cart.length === 0) { alert("Your cart is empty!"); return; }

  const userName  = document.getElementById("userName").value.trim();
  const contactNo = document.getElementById("contactNo").value.trim();
  const remarks   = document.getElementById("remarks").value.trim();
  const email     = document.getElementById("email").value.trim();

  if (!userName || !contactNo || !email) {
    alert("Please fill all required fields.");
    submitBtn.innerHTML = originalLabel;
    submitBtn.classList.remove("btn-loading");
    return;
  }

  saveUserDetails(userName, contactNo, email);

  const subcategories = await loadSubcategoriesWithCategoryNames();
  const items = [];

  cart.forEach(entry => {
    const subcat   = subcategories.find(
      s => String(s.CategoriesCode) === String(entry.CategoriesCode) &&
           String(s.id)             === String(entry.SubCategoriesCode)
    );
    const catName    = subcat?.Categories    || "-";
    const subcatName = subcat?.SubCategories || "-";
    entry.items.forEach(item => {
      items.push({ category: catName, subcategory: subcatName, item: item.name, remark: item.remark || "-" });
    });
  });

  const payload = { userName, contactNo, email, remarks, items };

  try {
    const res  = await fetch(`${API_BASE}/send-cart-enquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};

    if (res.ok) {
      alert("Enquiry sent successfully!");
      saveCart([]);
      bootstrap.Modal.getInstance(document.getElementById("enquiryModal")).hide();
      setTimeout(() => location.reload(), 300);
    } else {
      alert(json.error || "Failed to send enquiry.");
    }
  } catch (err) {
    console.error(err);
    alert("Server error.");
  } finally {
    submitBtn.innerHTML = originalLabel;
    submitBtn.classList.remove("btn-loading");
  }
});