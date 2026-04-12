import { db } from "/public/js/firebase-config.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { updateCartCount } from "/js/main.js";
updateCartCount();
document.getElementById("year").textContent = new Date().getFullYear();

async function loadCategories() {
  try {
    const container = document.getElementById("Tcategories");
    const loader = document.getElementById("categoryLoader");
    container.innerHTML = "";

    loader.style.display = "block";
    container.style.display = "none";

    const subSnap = await getDocs(collection(db, "subcategories"));
    const catSnap = await getDocs(collection(db, "categories"));

    const subData = subSnap.docs.map((doc) => doc.data());

    const catData = catSnap.docs.map((doc) => ({
      categoriescode: doc.id,
      ...doc.data(),
    }));

    const catMap = {};
    catData.forEach((cat) => {
      catMap[cat.categoriescode] = {
        category: cat.Categories,
        image: cat.ImageURL,
      };
    });

    const grouped = {};
    subData.forEach((item) => {
      if (!item.items || item.items.trim() === "") return;

      const catInfo = catMap[item.CategoriesCode];

      if (!catInfo) return;

      if (!grouped[item.CategoriesCode]) {
        grouped[item.CategoriesCode] = {
          CategoriesCode: item.CategoriesCode,
          category: catInfo.category,
          image: catInfo.image,
          subcategories: [],
        };
      }

      grouped[item.CategoriesCode].subcategories.push(item.SubCategories);
    });

    Object.keys(grouped).forEach((code) => {
      const data = grouped[code];

      let subText = data.subcategories.join(", ");

      if (subText.length > 40) {
        subText = subText.substring(0, 40) + "...";
      }

      const image =
        data.image || "/assets/images/subcategories/noitemfound.jpg";
      const categoryHTML = `
  <div class="col-6 col-md-4 col-lg-3">
    <a href="categories.html?catid=${code}" class="text-decoration-none">
      <div class="fm-cat-card text-center p-3">
        
        <div class="img-wrapper">
          <div class="img-loader"></div>

          <img src="${image}" 
               alt="${data.category}" 
               loading="lazy"
               class="fm-cat-img mb-2 card-img-top"
               onload="handleImageLoad(this)"
          >
        </div>

        <h6 class="fw-bold fm-cat-name">${data.category}</h6>
        <small class="text-muted">${subText}</small>
      </div>
    </a>
  </div>
`;

      container.insertAdjacentHTML("beforeend", categoryHTML);
    });

    setTimeout(() => {
      document.querySelectorAll(".fm-cat-img").forEach((img) => {
        img.onload = () => {
          const loader = img.previousElementSibling;
          if (loader) loader.style.display = "none";
          img.style.opacity = "1";
        };
      });
    }, 0);

    loader.style.display = "none";
    container.style.display = "flex";
  } catch (error) {
    console.error("❌ Error loading categories:", error);
  }
}

window.handleImageLoad = function (img) {
  const loader = img.previousElementSibling;

  if (loader) {
    loader.style.display = "none";
  }

  img.style.opacity = "1";
};

loadCategories();
