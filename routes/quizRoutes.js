const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
    createQuiz,
    getAllQuizzes,
    updateQuiz,
    deleteQuiz,
    updateQuizStatus
} = require("../controllers/quizController");

const router = express.Router();

router.post(
    "/",
    authenticateToken,
    adminMiddleware,
    createQuiz
);
router.get(
    "/",
    authenticateToken,
    adminMiddleware,
    getAllQuizzes
);
router.put(
    "/:id",
    authenticateToken,
    adminMiddleware,
    updateQuiz
);
router.delete(
    "/:id",
    authenticateToken,
    adminMiddleware,
    deleteQuiz
);
router.patch(
    "/:id/status",
    authenticateToken,
    adminMiddleware,
    updateQuizStatus
);
module.exports = router;