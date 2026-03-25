document.getElementById("year").textContent = new Date().getFullYear();

Promise.all([
  fetch("assets/JSON/subcategories.json").then((res) => res.json()),
  fetch("assets/JSON/categories.json").then((res) => res.json()),
])
  .then(([subData, catData]) => {
    const container = document.getElementById("Tcategories");
    container.innerHTML = "";

    const grouped = {};

    // Group Subcategories
    subData.forEach((item) => {
      if (!item.items || item.items.trim() === "") return;

      if (!grouped[item.CategoriesCode]) {
        grouped[item.CategoriesCode] = {
          CategoriesCode: item.CategoriesCode,
          category: item.Categories,
          subcategories: [],
        };
      }

      grouped[item.CategoriesCode].subcategories.push(item.SubCategories);
    });

    // Render Categories
    Object.keys(grouped).forEach((code) => {
      const category = grouped[code].category;
      const subs = grouped[code].subcategories;

      // Get Image from categories.json
      const catInfo = catData.find((c) => c.categoriescode == code);

      const image = catInfo
        ? catInfo.ImageURL
        : "/assets/images/subcategories/noitemfound.jpg";

      let subText = subs.join(", ");

      if (subText.length > 40) {
        subText = subText.substring(0, 40) + "...";
      }

      const categoryHTML = `
      <div class="col-6 col-md-4 col-lg-3">
        <a href="categories.html?catid=${code}" class="text-decoration-none">
          <div class="fm-cat-card text-center p-3">
            <img src="${image}" alt="${category}" loading="lazy" class="fm-cat-img mb-2">
            <h6 class="fw-bold fm-cat-name">${category}</h6>
            <small class="text-muted">${subText}</small>
          </div>
        </a>
      </div>
    `;

      container.insertAdjacentHTML("beforeend", categoryHTML);
    });
  })
  .catch((error) => console.error("Error loading categories:", error));
