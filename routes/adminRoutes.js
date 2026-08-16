const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
    getDashboardStats,
    getAllStudents,
    updateStudentStatus,
    deleteStudent,
    getAnalytics
} = require("../controllers/adminController");

const router = express.Router();

router.get(
    "/dashboard/stats",
    authenticateToken,
    adminMiddleware,
    getDashboardStats
);

router.get(
    "/users",
    authenticateToken,
    adminMiddleware,
    getAllStudents
);

router.patch(
    "/users/:id/status",
    authenticateToken,
    adminMiddleware,
    updateStudentStatus
);

router.delete(
    "/users/:id",
    authenticateToken,
    adminMiddleware,
    deleteStudent
);

router.get(
    "/analytics",
    authenticateToken,
    adminMiddleware,
    getAnalytics
);

module.exports = router;