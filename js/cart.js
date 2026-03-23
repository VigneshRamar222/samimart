document.getElementById("year").textContent = new Date().getFullYear();

document.addEventListener("DOMContentLoaded", async function () {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const emptySection = document.getElementById("emptyCartSection");
  const itemsSection = document.getElementById("cartItemsSection");
  const cartItemsContainer = document.getElementById("cartItems");

  if (cart.length === 0) {
    emptySection?.classList.remove("d-none");
    itemsSection?.classList.add("d-none");
    return;
  }

  emptySection?.classList.add("d-none");
  itemsSection?.classList.remove("d-none");
  cartItemsContainer.innerHTML = "";

  // Fetch JSON
  const response = await fetch("/assets/JSON/subcategories.json");
  const subcategories = await response.json();

  cart.forEach((cartItem, index) => {
    // Find matching subcategory
    const matchedCategory = subcategories.find(
      (sub) =>
        Number(sub.CategoriesCode) === Number(cartItem.CategoriesCode) &&
        Number(sub.SubCategoriesCode) === Number(cartItem.SubCategoriesCode),
    );

    // Prepare item list with remarks
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
});

function removeFromCart(index) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  location.reload(); // simple reload to refresh UI
}

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

    // Fetch subcategories
    const response = await fetch("/assets/JSON/subcategories.json");
    const subcategories = await response.json();

    // Map cart items
    const items = [];
    cart.forEach((cartItem) => {
      const matchedCategory = subcategories.find(
        (sub) =>
          Number(sub.CategoriesCode) === Number(cartItem.CategoriesCode) &&
          Number(sub.SubCategoriesCode) === Number(cartItem.SubCategoriesCode),
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
      const res = await fetch("http://localhost:3000/send-cart-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data_m),
      });

      const result = await res.json();

      if (res.ok) {
        alert("Enquiry sent successfully!");

        // Clear cart
        localStorage.setItem("cart", JSON.stringify([]));

        // Close modal
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
