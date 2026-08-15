const pool = require("../db");

const getStudentDashboard = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Dashboard statistics
        const statisticsResult = await pool.query(
            `SELECT
                COUNT(*) AS total_quizzes_attempted,

                COUNT(*) FILTER (
                    WHERE a.percentage >= q.passing_score
                ) AS total_quizzes_passed,

                COUNT(*) FILTER (
                    WHERE a.percentage < q.passing_score
                ) AS total_quizzes_failed,

                COALESCE(
                    ROUND(AVG(a.percentage), 2),
                    0
                ) AS average_score,

                COALESCE(
                    MAX(a.percentage),
                    0
                ) AS highest_score,

                COALESCE(
                    SUM(
                        a.correct_answers +
                        a.incorrect_answers
                    ),
                    0
                ) AS total_questions_answered

             FROM attempts a
             JOIN quizzes q
                ON a.quiz_id = q.id

             WHERE a.user_id = $1
             AND a.status = 'COMPLETED'`,
            [userId]
        );

        // 2. Quiz history
        const historyResult = await pool.query(
            `SELECT
                a.id AS attempt_id,
                a.quiz_id,
                q.title AS quiz_title,
                a.score,
                a.percentage,
                a.correct_answers,
                a.incorrect_answers,
                a.unanswered,
                a.time_taken,
                a.status,
                a.started_at,
                a.completed_at,

                CASE
                    WHEN a.percentage >= q.passing_score
                    THEN true
                    ELSE false
                END AS passed

             FROM attempts a
             JOIN quizzes q
                ON a.quiz_id = q.id

             WHERE a.user_id = $1
             AND a.status = 'COMPLETED'

             ORDER BY a.completed_at DESC`,
            [userId]
        );

        // 3. Performance chart data
        const performanceResult = await pool.query(
            `SELECT
                q.title AS quiz_title,
                a.percentage,
                a.completed_at

             FROM attempts a
             JOIN quizzes q
                ON a.quiz_id = q.id

             WHERE a.user_id = $1
             AND a.status = 'COMPLETED'

             ORDER BY a.completed_at ASC`,
            [userId]
        );

        res.json({
            statistics: statisticsResult.rows[0],
            history: historyResult.rows,
            performance: performanceResult.rows
        });

    } catch (error) {
        console.error(
            "Student dashboard error:",
            error
        );

        res.status(500).json({
            message: "Failed to load student dashboard"
        });
    }
};

module.exports = {
    getStudentDashboard
};