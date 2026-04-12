import { db } from "/public/js/firebase-config.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { updateCartCount } from "/js/main.js";

updateCartCount();

const isLocalHost =
  ["localhost", "127.0.0.1"].includes(window.location.hostname) ||
  window.location.hostname.startsWith("192.168.") ||
  window.location.hostname.startsWith("10.") ||
  window.location.hostname.startsWith("172.");

const API_BASE = isLocalHost ? "http://localhost:3000" : window.location.origin;

function setCartLoadingState(isLoading) {
  const cartLoader = document.getElementById("cartLoader");
  const emptySection = document.getElementById("emptyCartSection");
  const itemsSection = document.getElementById("cartItemsSection");

  if (cartLoader) {
    cartLoader.classList.toggle("is-hidden", !isLoading);
  }

  if (isLoading) {
    emptySection?.classList.add("d-none");
    itemsSection?.classList.add("d-none");
  }
}

async function loadSubcategoriesWithCategoryNames() {
  const subSnap = await getDocs(collection(db, "subcategories"));
  const catSnap = await getDocs(collection(db, "categories"));

  const categoryMap = {};
  catSnap.docs.forEach((doc) => {
    categoryMap[doc.id] = doc.data().Categories || "";
  });

  return subSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    Categories: categoryMap[doc.data().CategoriesCode] || "",
  }));
}

document.getElementById("year").textContent = new Date().getFullYear();

document.addEventListener("DOMContentLoaded", async function () {
  setCartLoadingState(true);
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const emptySection = document.getElementById("emptyCartSection");
  const itemsSection = document.getElementById("cartItemsSection");
  const cartItemsContainer = document.getElementById("cartItems");

  if (cart.length === 0) {
    emptySection?.classList.remove("d-none");
    itemsSection?.classList.add("d-none");
    setCartLoadingState(false);
    return;
  }

  try {
    emptySection?.classList.add("d-none");
    itemsSection?.classList.remove("d-none");
    cartItemsContainer.innerHTML = "";

    const subcategories = await loadSubcategoriesWithCategoryNames();

    cart.forEach((cartItem, index) => {
      const matchedCategory = subcategories.find(
        (sub) =>
          String(sub.CategoriesCode) === String(cartItem.CategoriesCode) &&
          String(sub.id) === String(cartItem.SubCategoriesCode),
      );

      const itemNamesWithRemarks = cartItem.items
        .map((i) => {
          if (i.remark && i.remark.trim() !== "") {
            return `${i.name} (${i.remark})`;
          } else {
            return i.name;
          }
        })
        .join(", ");

      const itemHTML = `
<div class="col-lg-3 col-md-4 col-sm-6 mb-4">
  <div class="card h-100 border-0 shadow-sm cart-card">

    <div class="text-center p-3 bg-light">
      <img src="${matchedCategory ? matchedCategory.SubImageURL : "/assets/images/subcategories/noitemfound.jpg"}" 
           alt="${itemNamesWithRemarks}"
           class="img-fluid"
           style="height:120px; object-fit:contain;">
    </div>

    <div class="card-body text-center">

      <h6 class="fw-bold mb-2 text-capitalize">
        ${itemNamesWithRemarks}
      </h6>

      <p class="mb-2 small text-muted">
        ${matchedCategory ? matchedCategory.SubCategories : "-"}
      </p>

      <button class="btn btn-sm btn-danger"
        onclick="removeFromCart(${index})">
        <i class="bi bi-trash"></i> Remove
      </button>

    </div>

  </div>
</div>
`;

      cartItemsContainer.innerHTML += itemHTML;
    });
  } catch (err) {
    console.error("Cart load failed:", err);
    emptySection?.classList.remove("d-none");
    itemsSection?.classList.add("d-none");
  } finally {
    setCartLoadingState(false);
  }
});

window.removeFromCart = function (index) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  location.reload();
};

let enquiryForm = document.getElementById("enquiryForm");

if (enquiryForm) {
  enquiryForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const sendBtn = document.getElementById("enquiryFormSubmit");
    const originalText = sendBtn.innerHTML;
    // Show loader
    sendBtn.classList.add("btn-loading");
    sendBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm"></span>
            Sending...
          `;
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    const userName = document.getElementById("userName").value.trim();
    const contactNo = document.getElementById("contactNo").value.trim();
    const remarks = document.getElementById("remarks").value.trim();
    const email = document.getElementById("email").value.trim();

    if (!userName || !contactNo || !email) {
      alert("Please fill all required fields.");
      return;
    }

    const subcategories = await loadSubcategoriesWithCategoryNames();

    const items = [];
    cart.forEach((cartItem) => {
      const matchedCategory = subcategories.find(
        (sub) =>
          String(sub.CategoriesCode) === String(cartItem.CategoriesCode) &&
          String(sub.id) === String(cartItem.SubCategoriesCode),
      );

      const category = matchedCategory ? matchedCategory.Categories : "-";
      const subcategory = matchedCategory ? matchedCategory.SubCategories : "-";

      cartItem.items.forEach((i) => {
        items.push({
          category: category,
          subcategory: subcategory,
          item: i.name,
          remark: i.remark || "-",
        });
      });
    });

    const data_m = {
      userName,
      contactNo,
      email,
      remarks,
      items,
    };

    try {
      const res = await fetch(`${API_BASE}/send-cart-enquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data_m),
      });

      const text = await res.text();
      const result = text ? JSON.parse(text) : {};

      if (res.ok) {
        alert("Enquiry sent successfully!");

        localStorage.setItem("cart", JSON.stringify([]));

        const modalEl = document.getElementById("enquiryModal");
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        modalInstance.hide();

        setTimeout(() => location.reload(), 300);
      } else {
        alert(result.error || "Failed to send enquiry.");
      }
    } catch (err) {
      console.error(err);
      alert("Server error.");
    } finally {
      sendBtn.innerHTML = originalText;
      sendBtn.classList.remove("btn-loading");
    }
  });
}
