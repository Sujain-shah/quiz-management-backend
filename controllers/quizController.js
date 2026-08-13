const pool = require("../db");

const createQuiz = async (req, res) => {
    try {
        const {
            title,
            description,
            category_id,
            difficulty,
            duration,
            passing_score,
            max_attempts
        } = req.body;

        if (
            !title ||
            !duration ||
            passing_score === undefined
        ) {
            return res.status(400).json({
                message: "Title, duration and passing score are required"
            });
        }

        const result = await pool.query(
            `INSERT INTO quizzes
            (title, description, category_id, difficulty, duration, passing_score, max_attempts)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                title,
                description || null,
                category_id || null,
                difficulty || null,
                duration,
                passing_score,
                max_attempts || 1
            ]
        );

        res.status(201).json({
            message: "Quiz created successfully",
            quiz: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to create quiz"
        });
    }
};
const getAllQuizzes = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM quizzes
             ORDER BY created_at DESC`
        );

        res.json({
            quizzes: result.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch quizzes"
        });
    }
};

const updateQuiz = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            title,
            description,
            difficulty,
            duration,
            passing_score,
            max_attempts
        } = req.body;

        const result = await pool.query(
            `UPDATE quizzes
             SET title = $1,
                 description = $2,
                 difficulty = $3,
                 duration = $4,
                 passing_score = $5,
                 max_attempts = $6,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $7
             RETURNING *`,
            [
                title,
                description,
                difficulty,
                duration,
                passing_score,
                max_attempts,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        res.json({
            message: "Quiz updated successfully",
            quiz: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update quiz"
        });
    }
};
const deleteQuiz = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM quizzes
             WHERE id = $1
             RETURNING id, title`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        res.json({
            message: "Quiz deleted successfully",
            quiz: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to delete quiz"
        });
    }
};

const updateQuizStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["DRAFT", "PUBLISHED"].includes(status)) {
            return res.status(400).json({
                message: "Invalid quiz status"
            });
        }

        const result = await pool.query(
            `UPDATE quizzes
             SET status = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        res.json({
            message: `Quiz ${status.toLowerCase()} successfully`,
            quiz: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update quiz status"
        });
    }
};

module.exports = {
    createQuiz,
    getAllQuizzes,
    updateQuiz,
    deleteQuiz,
    updateQuizStatus
};