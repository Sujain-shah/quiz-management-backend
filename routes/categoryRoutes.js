const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
    createCategory,
    getAllCategories,
    updateCategory,
    deleteCategory
} = require("../controllers/categoryController");

const router = express.Router();

router.get(
    "/",
    authenticateToken,
    adminMiddleware,
    getAllCategories
);

router.post(
    "/",
    authenticateToken,
    adminMiddleware,
    createCategory
);

router.put(
    "/:id",
    authenticateToken,
    adminMiddleware,
    updateCategory
);

router.delete(
    "/:id",
    authenticateToken,
    adminMiddleware,
    deleteCategory
);

module.exports = router;