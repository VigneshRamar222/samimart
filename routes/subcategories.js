const express = require("express");
const fs = require("fs").promises;
const path = require("path");

const router = express.Router();

//const DB_PATH = path.join(__dirname, "../db/subcategories.json");
const UPLOAD_PATH = path.join(__dirname, "../assets/images/categories");

//const categoriesPath = path.join(__dirname, "./assets/JSON/categories.json");
const DB_PATH = path.join(__dirname, "../assets/JSON/subcategories.json");

const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_PATH);
  },
  filename: (req, file, cb) => {
    const fileName = "sub_" + Date.now() + path.extname(file.originalname);
    cb(null, fileName);
  },
});

const upload = multer({ storage });

// ---------------- SAFE FILE DELETE ----------------
async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
    console.log("Deleted:", filePath);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("File delete error:", err);
    }
  }
}

// ---------------- GET ALL SUBCATEGORIES ----------------
router.get("/", async (req, res) => {
  try {
    const data = await fs.readFile(DB_PATH, "utf8");
    res.json(JSON.parse(data));
  } catch (err) {
    res.json([]);
  }
});
//----------------------Item Delete

router.delete("/:subId/:catId/:itemName", async (req, res) => {
  try {
    const subId = Number(req.params.subId);
    const catId = Number(req.params.catId);
    const itemName = decodeURIComponent(req.params.itemName)
      .trim()
      .toLowerCase();

    const data = await fs.readFile(DB_PATH, "utf8");
    let subcategories = JSON.parse(data);

    const index = subcategories.findIndex(
      (s) =>
        Number(s.SubCategoriesCode) === subId &&
        Number(s.CategoriesCode) === catId,
    );

    if (index === -1) {
      return res.status(404).json({ msg: "Subcategory not found" });
    }

    // Convert string → array
    let itemsArray = subcategories[index].items.split(",").map((i) => i.trim());

    // Remove only the selected item
    itemsArray = itemsArray.filter((i) => i.toLowerCase() !== itemName);

    // Save back
    subcategories[index].items = itemsArray.join(", ");

    await fs.writeFile(DB_PATH, JSON.stringify(subcategories, null, 2));

    res.json({ msg: "Item deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ---------------- ADD ITEM TO SUBCATEGORY ----------------
router.post("/:subId/items", async (req, res) => {
  try {
    const subId = Number(req.params.subId);
    const name = req.body.name?.trim();

    if (!subId || !name) {
      return res.status(400).json({ msg: "Invalid data" });
    }

    const data = await fs.readFile(DB_PATH, "utf8");
    let subcategories = JSON.parse(data);

    const index = subcategories.findIndex(
      (s) => Number(s.SubCategoriesCode) === subId,
    );

    if (index === -1) {
      return res.status(404).json({ msg: "Subcategory not found" });
    }

    // Convert items string → array
    let itemsArray = subcategories[index].items
      ? subcategories[index].items.split(",").map((i) => i.trim())
      : [];

    itemsArray.push(name);

    // Save back as string
    subcategories[index].items = itemsArray.join(", ");

    await fs.writeFile(DB_PATH, JSON.stringify(subcategories, null, 2));

    res.json({ msg: "Item added successfully" });
  } catch (err) {
    console.error("Add item error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ---------------- DELETE SUBCATEGORY ----------------
router.delete("/:id", async (req, res) => {
  try {
    const subId = Number(req.params.id);

    if (!subId || isNaN(subId)) {
      return res.status(400).json({ msg: "Invalid subcategory id" });
    }

    const data = await fs.readFile(DB_PATH, "utf8");
    let subcategories = JSON.parse(data);

    const index = subcategories.findIndex((s) => s.SubCategoriesCode === subId);

    if (index === -1) {
      return res.status(404).json({ msg: "Subcategory not found" });
    }

    const sub = subcategories[index];

    // Delete image if exists
    if (sub.SubImageURL) {
      const imgPath = path.join(UPLOAD_PATH, path.basename(sub.SubImageURL));
      await deleteFile(imgPath);
    }

    subcategories.splice(index, 1);

    await fs.writeFile(DB_PATH, JSON.stringify(subcategories, null, 2));

    res.json({ msg: "Subcategory deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ---------------- ADD SUBCATEGORY ----------------
// ---------------- ADD SUBCATEGORY ----------------
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const name = req.body.name;
    const categoryId = req.body.categoryId;
    const image = req.file;

    if (!name || !categoryId || !image) {
      return res.status(400).json({ msg: "Missing fields" });
    }

    const data = await fs.readFile(DB_PATH, "utf8");
    let subcategories = JSON.parse(data);

    const newSub = {
      CategoriesCode: Number(categoryId),
      Categories: "Crockeries",
      SubCategoriesCode: Date.now(),
      SubCategories: name,
      items: "",
      SubImageURL: "/assets/images/categories/" + image.filename,
      active: 1,
    };

    subcategories.push(newSub);

    await fs.writeFile(DB_PATH, JSON.stringify(subcategories, null, 2));

    res.json({ msg: "Subcategory added successfully" });
  } catch (err) {
    console.error("Add error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
