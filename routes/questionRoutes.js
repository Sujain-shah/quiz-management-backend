const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
    createQuestion,
    getQuizQuestions,
    updateQuestion,
    deleteQuestion
} = require("../controllers/questionController");

const router = express.Router();

router.post(
    "/quizzes/:quizId/questions",
    authenticateToken,
    adminMiddleware,
    createQuestion
);
router.get(
    "/quizzes/:quizId/questions",
    authenticateToken,
    adminMiddleware,
    getQuizQuestions
);
router.put(
    "/questions/:id",
    authenticateToken,
    adminMiddleware,
    updateQuestion
);
router.delete(
    "/questions/:id",
    authenticateToken,
    adminMiddleware,
    deleteQuestion
);
module.exports = router;