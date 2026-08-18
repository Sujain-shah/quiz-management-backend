const pool = require("../db");

const getLeaderboard = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                u.id AS user_id,
                u.name,
                COUNT(a.id)::int AS quizzes_attempted,
                COALESCE(SUM(a.score), 0) AS total_score,
                COALESCE(
                    ROUND(AVG(a.percentage), 2),
                    0
                ) AS average_percentage,
                COALESCE(
                    MAX(a.percentage),
                    0
                ) AS highest_percentage
             FROM users u
             JOIN attempts a
                ON u.id = a.user_id
             WHERE u.role = 'STUDENT'
             AND a.status = 'COMPLETED'
             GROUP BY u.id, u.name
             ORDER BY
                average_percentage DESC,
                total_score DESC,
                quizzes_attempted DESC,
                u.name ASC`
        );

        const leaderboard = result.rows.map(
            (student, index) => ({
                rank: index + 1,
                user_id: student.user_id,
                name: student.name,
                quizzes_attempted:
                    student.quizzes_attempted,
                total_score:
                    Number(student.total_score),
                average_percentage:
                    Number(student.average_percentage),
                highest_percentage:
                    Number(student.highest_percentage)
            })
        );

        res.json({
            leaderboard
        });

    } catch (error) {
        console.error(
            "Leaderboard error:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch leaderboard"
        });
    }
};

module.exports = {
    getLeaderboard
};