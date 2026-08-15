const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");

const {
    getStudentDashboard
} = require("../controllers/studentController");

const router = express.Router();

router.get(
    "/student/dashboard",
    authenticateToken,
    getStudentDashboard
);

module.exports = router;