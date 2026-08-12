const pool = require("../db");

const getDashboardStats = async (req, res) => {
    try {
        const studentsResult = await pool.query(
            "SELECT COUNT(*) FROM users WHERE role = 'STUDENT'"
        );

        res.json({
            totalStudents: Number(studentsResult.rows[0].count)
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

module.exports = {
    getDashboardStats,
    getAllStudents,
    updateStudentStatus,
    deleteStudent
};