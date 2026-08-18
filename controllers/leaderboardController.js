const pool = require("../db");

const getLeaderboard = async (req, res) => {
    try {
        const result = await pool.query(
            `WITH leaderboard_data AS (
                SELECT
                    u.id AS user_id,
                    u.name,

                    COUNT(a.id)::int AS quizzes_attempted,

                    COALESCE(
                        SUM(a.score),
                        0
                    ) AS total_score,

                    COALESCE(
                        ROUND(AVG(a.percentage), 2),
                        0
                    ) AS average_percentage,

                    COALESCE(
                        ROUND(AVG(a.time_taken), 2),
                        0
                    ) AS average_time,

                    COALESCE(
                        MAX(a.percentage),
                        0
                    ) AS highest_percentage

                FROM users u

                JOIN attempts a
                    ON u.id = a.user_id

                JOIN quizzes q
                    ON a.quiz_id = q.id

                WHERE u.role = 'STUDENT'
                AND a.status = 'COMPLETED'

                GROUP BY
                    u.id,
                    u.name
            )

            SELECT
                *,
                RANK() OVER (
                    ORDER BY
                        average_percentage DESC,
                        average_time ASC
                ) AS rank

            FROM leaderboard_data

            ORDER BY
                rank ASC,
                name ASC`
        );

        const leaderboard = result.rows.map(
            (student) => ({
                rank: Number(student.rank),
                user_id: student.user_id,
                name: student.name,
                quizzes_attempted:
                    student.quizzes_attempted,
                total_score:
                    Number(student.total_score),
                average_percentage:
                    Number(student.average_percentage),
                average_time:
                    Number(student.average_time),
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