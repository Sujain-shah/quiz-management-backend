const cors = require("cors");
const express = require("express");
const pool = require("./db");
const testRoutes = require("./routes/testRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const quizRoutes = require("./routes/quizRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const questionRoutes = require("./routes/questionRoutes");
const attemptRoutes = require("./routes/attemptRoutes");
const studentRoutes = require("./routes/studentRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api", questionRoutes);
app.use("/api", attemptRoutes);
app.use("/api", studentRoutes);
app.use("/api", leaderboardRoutes);
app.get("/", (req, res) => {
    res.send("Quiz Management Platform Backend is running!");
});

app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            status: "success",
            message: "Backend and database are connected",
            databaseTime: result.rows[0].now
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            status: "error",
            message: "Database connection failed"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});