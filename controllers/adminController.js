const pool = require("../db");

const getDashboardStats = async (req, res) => {
    try {
        const studentsResult = await pool.query(
            "SELECT COUNT(*) FROM users WHERE role = 'STUDENT'"
        );

        res.json({
            totalStudents: Number(
                studentsResult.rows[0].count
            )
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch dashboard statistics"
        });
    }
};


const getAllStudents = async (req, res) => {
    try {
        const search = req.query.search || "";

        const result = await pool.query(
            `SELECT id, name, email, role, status, created_at
             FROM users
             WHERE role = 'STUDENT'
             AND (
                 name ILIKE $1
                 OR email ILIKE $1
             )
             ORDER BY created_at DESC`,
            [`%${search}%`]
        );

        res.json({
            students: result.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch students"
        });
    }
};


const updateStudentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["ACTIVE", "INACTIVE"].includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        const result = await pool.query(
            `UPDATE users
             SET status = $1
             WHERE id = $2 AND role = 'STUDENT'
             RETURNING id, name, email, role, status`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.json({
            message: "Student status updated successfully",
            student: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update student status"
        });
    }
};


const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM users
             WHERE id = $1 AND role = 'STUDENT'
             RETURNING id, name, email`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.json({
            message: "Student deleted successfully",
            student: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to delete student"
        });
    }
};


/* =========================
   ADMIN ANALYTICS
========================= */

const getAnalytics = async (req, res) => {
    try {
        // Overall statistics
        const overviewResult = await pool.query(
            `SELECT
                COUNT(*) AS total_attempts,
                COALESCE(ROUND(AVG(percentage), 2), 0) AS average_score,
                COUNT(*) FILTER (
                    WHERE percentage >= q.passing_score
                ) AS passed_attempts,
                COUNT(*) FILTER (
                    WHERE percentage < q.passing_score
                ) AS failed_attempts
             FROM attempts a
             JOIN quizzes q
                ON a.quiz_id = q.id
             WHERE a.status = 'COMPLETED'`
        );

        // Quiz-wise performance
        const quizPerformanceResult = await pool.query(
            `SELECT
                q.id AS quiz_id,
                q.title AS quiz_title,
                COUNT(a.id) AS attempts,
                COALESCE(
                    ROUND(AVG(a.percentage), 2),
                    0
                ) AS average_score,
                COUNT(*) FILTER (
                    WHERE a.percentage >= q.passing_score
                ) AS passed,
                COUNT(*) FILTER (
                    WHERE a.percentage < q.passing_score
                ) AS failed
             FROM quizzes q
             LEFT JOIN attempts a
                ON a.quiz_id = q.id
                AND a.status = 'COMPLETED'
             GROUP BY q.id, q.title
             ORDER BY attempts DESC, q.title ASC`
        );

        // Recent attempts
        const recentAttemptsResult = await pool.query(
            `SELECT
                a.id AS attempt_id,
                q.title AS quiz_title,
                u.name AS student_name,
                a.percentage,
                a.completed_at,
                CASE
                    WHEN a.percentage >= q.passing_score
                    THEN true
                    ELSE false
                END AS passed
             FROM attempts a
             JOIN quizzes q
                ON a.quiz_id = q.id
             JOIN users u
                ON a.user_id = u.id
             WHERE a.status = 'COMPLETED'
             ORDER BY a.completed_at DESC
             LIMIT 10`
        );

        res.json({
            overview: overviewResult.rows[0],
            quizPerformance: quizPerformanceResult.rows,
            recentAttempts: recentAttemptsResult.rows
        });

    } catch (error) {
        console.error("Admin analytics error:", error);

        res.status(500).json({
            message: "Failed to fetch analytics"
        });
    }
};


module.exports = {
    getDashboardStats,
    getAllStudents,
    updateStudentStatus,
    deleteStudent,
    getAnalytics
};