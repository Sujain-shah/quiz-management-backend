const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const studentMiddleware = require("../middleware/studentMiddleware");

const router = express.Router();

router.get(
    "/admin",
    authenticateToken,
    adminMiddleware,
    (req, res) => {
        res.json({
            message: "Welcome Admin",
            user: req.user
        });
    }
);

router.get(
    "/student",
    authenticateToken,
    studentMiddleware,
    (req, res) => {
        res.json({
            message: "Welcome Student",
            user: req.user
        });
    }
);

module.exports = router;