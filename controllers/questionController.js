const pool = require("../db");

const createQuestion = async (req, res) => {
    const client = await pool.connect();

    try {
        const { quizId } = req.params;

        const {
            question_text,
            marks,
            explanation,
            difficulty,
            options
        } = req.body;

        if (!question_text || !options || options.length !== 4) {
            return res.status(400).json({
                message: "Question text and exactly 4 options are required"
            });
        }

        const correctOptions = options.filter(
            (option) => option.is_correct === true
        );

        if (correctOptions.length !== 1) {
            return res.status(400).json({
                message: "Exactly one option must be correct"
            });
        }

        await client.query("BEGIN");

        const questionResult = await client.query(
            `INSERT INTO questions
            (quiz_id, question_text, marks, explanation, difficulty)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [
                quizId,
                question_text,
                marks || 1,
                explanation || null,
                difficulty || null
            ]
        );

        const question = questionResult.rows[0];

        const createdOptions = [];

        for (const option of options) {
            const optionResult = await client.query(
                `INSERT INTO options
                (question_id, option_text, is_correct)
                VALUES ($1, $2, $3)
                RETURNING *`,
                [
                    question.id,
                    option.option_text,
                    option.is_correct
                ]
            );

            createdOptions.push(optionResult.rows[0]);
        }

        await client.query("COMMIT");

        res.status(201).json({
            message: "Question created successfully",
            question,
            options: createdOptions
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error(error);

        res.status(500).json({
            message: "Failed to create question"
        });

    } finally {
        client.release();
    }
};
const getQuizQuestions = async (req, res) => {
    try {
        const { quizId } = req.params;

        const result = await pool.query(
            `SELECT
                q.id,
                q.quiz_id,
                q.question_text,
                q.marks,
                q.explanation,
                q.difficulty,
                q.created_at,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', o.id,
                            'option_text', o.option_text,
                            'is_correct', o.is_correct
                        )
                        ORDER BY o.id
                    ) FILTER (WHERE o.id IS NOT NULL),
                    '[]'
                ) AS options
             FROM questions q
             LEFT JOIN options o
                ON q.id = o.question_id
             WHERE q.quiz_id = $1
             GROUP BY q.id
             ORDER BY q.id`,
            [quizId]
        );

        res.json({
            questions: result.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch questions"
        });
    }
};
const updateQuestion = async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        const {
            question_text,
            marks,
            explanation,
            difficulty,
            options
        } = req.body;

        if (!question_text || !options || options.length !== 4) {
            return res.status(400).json({
                message: "Question text and exactly 4 options are required"
            });
        }

        const correctOptions = options.filter(
            (option) => option.is_correct === true
        );

        if (correctOptions.length !== 1) {
            return res.status(400).json({
                message: "Exactly one option must be correct"
            });
        }

        await client.query("BEGIN");

        const questionResult = await client.query(
            `UPDATE questions
             SET question_text = $1,
                 marks = $2,
                 explanation = $3,
                 difficulty = $4
             WHERE id = $5
             RETURNING *`,
            [
                question_text,
                marks || 1,
                explanation || null,
                difficulty || null,
                id
            ]
        );

        if (questionResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Question not found"
            });
        }

        const question = questionResult.rows[0];

        await client.query(
            `DELETE FROM options
             WHERE question_id = $1`,
            [id]
        );

        const updatedOptions = [];

        for (const option of options) {
            const optionResult = await client.query(
                `INSERT INTO options
                (question_id, option_text, is_correct)
                VALUES ($1, $2, $3)
                RETURNING *`,
                [
                    id,
                    option.option_text,
                    option.is_correct
                ]
            );

            updatedOptions.push(optionResult.rows[0]);
        }

        await client.query("COMMIT");

        res.json({
            message: "Question updated successfully",
            question,
            options: updatedOptions
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error(error);

        res.status(500).json({
            message: "Failed to update question"
        });

    } finally {
        client.release();
    }
};
const deleteQuestion = async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        await client.query("BEGIN");

        // Delete options first
        await client.query(
            `DELETE FROM options
             WHERE question_id = $1`,
            [id]
        );

        const result = await client.query(
            `DELETE FROM questions
             WHERE id = $1
             RETURNING id, question_text`,
            [id]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Question not found"
            });
        }

        await client.query("COMMIT");

        res.json({
            message: "Question deleted successfully",
            question: result.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error(error);

        res.status(500).json({
            message: "Failed to delete question"
        });

    } finally {
        client.release();
    }
};

module.exports = {
    createQuestion,
    getQuizQuestions,
    updateQuestion,
    deleteQuestion
};