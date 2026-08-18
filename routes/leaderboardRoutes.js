const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");

const {
    getLeaderboard
} = require("../controllers/leaderboardController");

const router = express.Router();

router.get(
    "/leaderboard",
    authenticateToken,
    getLeaderboard
);

module.exports = router;