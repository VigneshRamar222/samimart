/* =============================
   FreshMart - Main JavaScript
   ============================= */

// Navbar Active Link Highlighting
(function () {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('#mainNavbar .nav-link');
  navLinks.forEach(function (link) {
    const linkPage = link.getAttribute('href');
    if (linkPage === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
})();


// Navbar Scroll Shadow
window.addEventListener('scroll', function () {
  const navbar = document.getElementById('mainNavbar');
  if (!navbar) return;
  if (window.scrollY > 30) {
    navbar.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
  } else {
    navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.15)';
  }
});


// Smooth Scroll for Anchor Links
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        window.scrollTo({
          top: target.offsetTop - 80,
          behavior: 'smooth'
        });
      }
    });
  });
});


// Card Entrance Animation on Scroll
document.addEventListener('DOMContentLoaded', function () {
  const cards = document.querySelectorAll('.card');
  if (!cards.length) return;

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(function (card) {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    observer.observe(card);
  });
});


// Stats Counter Animation (About page)
document.addEventListener('DOMContentLoaded', function () {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const countObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.getAttribute('data-count'));
        let current = 0;
        const step = Math.ceil(target / 60);
        const timer = setInterval(function () {
          current += step;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          entry.target.textContent = current.toLocaleString() + '+';
        }, 25);
        countObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(function (counter) {
    countObserver.observe(counter);
  });
});


// Back to Top Button (auto-inject)
document.addEventListener('DOMContentLoaded', function () {
  const btn = document.createElement('button');
  btn.innerHTML = '<i class="bi bi-arrow-up-short fs-4"></i>';
  btn.setAttribute('title', 'Back to top');
  btn.style.cssText = [
    'position:fixed',
    'bottom:28px',
    'right:28px',
    'width:44px',
    'height:44px',
    'border-radius:50%',
    'border:none',
    'background:#0d9488',
    'color:#fff',
    'display:none',
    'align-items:center',
    'justify-content:center',
    'cursor:pointer',
    'box-shadow:0 4px 12px rgba(0,0,0,0.2)',
    'z-index:9999',
    'transition:opacity 0.3s'
  ].join(';');

  document.body.appendChild(btn);

  window.addEventListener('scroll', function () {
    if (window.scrollY > 200) {
      btn.style.display = 'block';
    } else {
      btn.style.display = 'none';
    }
  });

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

///update cart count for all pages
function updateCartCount() {

  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  // get unique subcategory codes
  const uniqueSubCategories = new Set(
    cart.map(entry => entry.SubCategoriesCode)
  );

  const subCategoryCount = uniqueSubCategories.size;

  const cartCountElem = document.getElementById("cartCount");

  if (cartCountElem) {
    cartCountElem.textContent = subCategoryCount;
  }

}

updateCartCount();


////auto compete code for all pages
const input = document.getElementById("searchInput");
const suggestionBox = document.getElementById("searchSuggestions");

if(input && suggestionBox){

let searchData = [];
let selectedIndex = -1;

fetch("assets/JSON/subcategories.json")
.then(res => res.json())
.then(data => {
  //searchData = data;

  searchData = data.map(item => ({
  ...item,
  itemsArray: item.items ? item.items.toLowerCase().split(",") : []
}));

});



input.addEventListener("input", function(){

  const query = this.value.toLowerCase();
  suggestionBox.innerHTML = "";
  selectedIndex = -1;

  if(query.length < 2){
    suggestionBox.style.display = "none";
    return;
  }

  const results = searchData.filter(item => {

    const subCategory = item.SubCategories.toLowerCase();
    //const items = item.items ? item.items.toLowerCase() : "";

    //return subCategory.includes(query) || items.includes(query);

    return (
  subCategory.includes(query) ||
  item.itemsArray.some(i => i.includes(query))
);


  });

  results.slice(0,8).forEach((item,index)=>{

    const div = document.createElement("div");
    div.classList.add("fm-suggestion-item");

    let matchedItem = "";

    if(item.items){
      const itemList = item.items.toLowerCase().split(",");
      const found = itemList.find(i => i.trim().includes(query));

      if(found){
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
      window.location.href =
      `categories.html?catid=${item.CategoriesCode}&sub=${item.SubCategoriesCode}`;
    };

    suggestionBox.appendChild(div);

  });

  suggestionBox.style.display = results.length ? "block" : "none";

});

input.addEventListener("keydown", function(e){

  const items = suggestionBox.querySelectorAll(".fm-suggestion-item");

  if(!items.length) return;

  if(e.key === "ArrowDown"){

    selectedIndex++;
    if(selectedIndex >= items.length) selectedIndex = 0;

    updateHighlight(items);
  }

  else if(e.key === "ArrowUp"){

    selectedIndex--;
    if(selectedIndex < 0) selectedIndex = items.length - 1;

    updateHighlight(items);
  }

  else if(e.key === "Enter"){

    e.preventDefault();

    if(selectedIndex > -1){
      items[selectedIndex].click();
    }else{
      const query = input.value.trim();
      if(query){
        window.location.href = `categories.html?search=${encodeURIComponent(query)}`;
      }
    }

  }

});

function updateHighlight(items){

  items.forEach(item => item.classList.remove("active"));

  if(selectedIndex >= 0){
    items[selectedIndex].classList.add("active");

    items[selectedIndex].scrollIntoView({
      block: "nearest"
    });
  }

}

document.addEventListener("click", function(e){

  const searchBar = document.querySelector(".fm-search-bar");

if(searchBar && !searchBar.contains(e.target)){
  suggestionBox.style.display = "none";
}
  // if(!document.querySelector(".fm-search-bar").contains(e.target)){
  //   suggestionBox.style.display = "none";
  // }
});

}