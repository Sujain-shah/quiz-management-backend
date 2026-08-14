const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");

const {
    startQuiz,
    submitAnswer,
    getAttempt,
    submitQuiz,
    getAttemptResult,
    getDetailedResult
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
router.get(
    "/attempts/:attemptId/result",
    authenticateToken,
    getAttemptResult
);
router.get(
    "/attempts/:attemptId/detailed-result",
    authenticateToken,
    getDetailedResult
);

module.exports = router;