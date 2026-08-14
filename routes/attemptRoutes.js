const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");

const {
    startQuiz,
    submitAnswer,
    getAttempt,
    submitQuiz
} = require("../controllers/attemptController");

const router = express.Router();

router.post(
    "/quizzes/:quizId/start",
    authenticateToken,
    startQuiz
);

router.post(
    "/attempts/:attemptId/answers",
    authenticateToken,
    submitAnswer
);
router.get(
    "/attempts/:attemptId",
    authenticateToken,
    getAttempt
);
router.post(
    "/attempts/:attemptId/submit",
    authenticateToken,
    submitQuiz
);
module.exports = router;