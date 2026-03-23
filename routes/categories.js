const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const multer = require("multer");

const router = express.Router();

const categoriesPath = path.join(__dirname, "../assets/JSON/categories.json");
const subcategoriesPath = path.join(
  __dirname,
  "../assets/JSON/subcategories.json",
);

// const categoriesPath = path.join(process.cwd(), "db", "categories.json");
// const subcategoriesPath = path.join(process.cwd(), "db", "subcategories.json");

// -------------------- MULTER CONFIG --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "assets/images/categories/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `cat_${Date.now()}${ext}`);
  },
});

// Allow only images
const fileFilter = (req, file, cb) => {
  const allowed = [".png", ".jpg", ".jpeg", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowed.includes(ext)) return cb(new Error("Only image files allowed"));
  cb(null, true);
};

const upload = multer({ storage, fileFilter });

// -------------------- HELPERS --------------------
async function readJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return data ? JSON.parse(data) : [];
  } catch (err) {
    return [];
  }
}

async function writeJSON(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
    console.log("JSON updated successfully");
  } catch (err) {
    console.error("Error writing JSON:", err);
  }
}

async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== "ENOENT") console.error(err);
  }
}

// ---------------- POST : Add Category ----------------
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name: categoryName } = req.body;

    if (!categoryName || !req.file)
      return res.status(400).json({ msg: "Category name & image required" });

    const categories = await readJSON(categoriesPath);

    // Prevent duplicate names
    const exists = categories.find((c) => {
      const nameFromFile = c.Categories || "";
      return (
        nameFromFile.trim().toLowerCase() === categoryName.trim().toLowerCase()
      );
    });

    if (exists) return res.status(400).json({ msg: "Category already exists" });

    const newId =
      categories.length > 0
        ? Math.max(...categories.map((c) => c.categoriescode || 0)) + 1
        : 1;

    const newCategory = {
      Categories: categoryName.trim(),
      categoriescode: newId,
      ImageURL: `/assets/images/categories/${req.file.filename}`,
    };

    categories.push(newCategory);
    await writeJSON(categoriesPath, categories);

    res.json({ msg: "Category added successfully", category: newCategory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ---------------- DELETE : Remove Category ----------------
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    let categories = await readJSON(categoriesPath);
    let subcategories = await readJSON(subcategoriesPath);

    const category = categories.find((c) => c.categoriescode === id);

    if (!category) return res.status(404).json({ msg: "Category not found" });

    // Delete category image
    if (category.ImageURL)
      await deleteFile(
        path.join(process.cwd(), category.ImageURL.replace(/^\/+/, "")),
      );
    //   await deleteFile(path.join(process.cwd(), category.ImageURL));

    //      await deleteFile(path.join(__dirname, "/", category.ImageURL));

    // Delete subcategory images
    const relatedSubs = subcategories.filter((s) => s.CategoriesCode === id);

    for (const sub of relatedSubs) {
      if (sub.SubImageURL)
        //await deleteFile(path.join(process.cwd(), sub.SubImageURL));
        await deleteFile(
          path.join(process.cwd(), sub.SubImageURL.replace(/^\/+/, "")),
        );
      //await deleteFile(path.join(__dirname, "/", sub.SubImageURL));
    }

    // Remove records
    categories = categories.filter((c) => c.categoriescode !== id);
    subcategories = subcategories.filter((s) => s.CategoriesCode !== id);

    await writeJSON(categoriesPath, categories);
    await writeJSON(subcategoriesPath, subcategories);

    res.json({ msg: "Category deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// router.get("/", async (req, res) => {
//   res.json({ message: "Categories working" });
// });

router.get("/", async (req, res) => {
  try {
    const data = await fs.readFile(categoriesPath, "utf8");
    res.json(JSON.parse(data));
  } catch (err) {
    res.json([]);
  }
});

module.exports = router;
