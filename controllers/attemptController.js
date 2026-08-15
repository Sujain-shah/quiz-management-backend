const pool = require("../db");

const startQuiz = async (req, res) => {
    const client = await pool.connect();

    try {
        const { quizId } = req.params;
        const userId = req.user.id;

        // Check quiz
        const quizResult = await client.query(
            `SELECT
                id,
                title,
                duration,
                max_attempts,
                status
             FROM quizzes
             WHERE id = $1 AND status = 'PUBLISHED'`,
            [quizId]
        );

        if (quizResult.rows.length === 0) {
            return res.status(404).json({
                message: "Published quiz not found"
            });
        }

        const quiz = quizResult.rows[0];

        // Check previous attempts
        const attemptsResult = await client.query(
            `SELECT COUNT(*)::int AS count
             FROM attempts
             WHERE quiz_id = $1
             AND user_id = $2`,
            [quizId, userId]
        );

        const attemptCount = attemptsResult.rows[0].count;

        if (attemptCount >= quiz.max_attempts) {
            return res.status(400).json({
                message: "Maximum attempts reached"
            });
        }

        // Create attempt
        const attemptResult = await client.query(
            `INSERT INTO attempts
            (quiz_id, user_id, status, started_at)
            VALUES ($1, $2, 'IN_PROGRESS', CURRENT_TIMESTAMP)
            RETURNING id, quiz_id, user_id, status, started_at`,
            [quizId, userId]
        );

        const attempt = attemptResult.rows[0];

        // Get questions WITHOUT correct answers
        const questionsResult = await client.query(
            `SELECT
                q.id,
                q.question_text,
                q.marks,
                q.explanation,
                q.difficulty,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', o.id,
                            'option_text', o.option_text
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

        res.status(201).json({
            message: "Quiz started successfully",
            attempt,
            quiz: {
                id: quiz.id,
                title: quiz.title,
                duration: quiz.duration
            },
            questions: questionsResult.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to start quiz"
        });

    } finally {
        client.release();
    }
};

const submitAnswer = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const { question_id, selected_option_id } = req.body;
        const userId = req.user.id;

        if (!question_id || !selected_option_id) {
            return res.status(400).json({
                message: "Question and selected option are required"
            });
        }

        // Check that attempt belongs to this student
        const attemptResult = await pool.query(
            `SELECT id, quiz_id
             FROM attempts
             WHERE id = $1
             AND user_id = $2
             AND status = 'IN_PROGRESS'`,
            [attemptId, userId]
        );

        if (attemptResult.rows.length === 0) {
            return res.status(404).json({
                message: "Active attempt not found"
            });
        }

        // Check correct answer from database
        const optionResult = await pool.query(
            `SELECT
                o.id,
                o.question_id,
                o.is_correct
             FROM options o
             WHERE o.id = $1
             AND o.question_id = $2`,
            [selected_option_id, question_id]
        );

        if (optionResult.rows.length === 0) {
            return res.status(400).json({
                message: "Invalid option"
            });
        }

        const isCorrect = optionResult.rows[0].is_correct;

        // If answer already exists, update it
        const existingAnswer = await pool.query(
            `SELECT id
             FROM answers
             WHERE attempt_id = $1
             AND question_id = $2`,
            [attemptId, question_id]
        );

        let result;

        if (existingAnswer.rows.length > 0) {
            result = await pool.query(
                `UPDATE answers
                 SET selected_option_id = $1,
                     is_correct = $2
                 WHERE id = $3
                 RETURNING *`,
                [
                    selected_option_id,
                    isCorrect,
                    existingAnswer.rows[0].id
                ]
            );
        } else {
            result = await pool.query(
                `INSERT INTO answers
                (attempt_id, question_id, selected_option_id, is_correct)
                VALUES ($1, $2, $3, $4)
                RETURNING *`,
                [
                    attemptId,
                    question_id,
                    selected_option_id,
                    isCorrect
                ]
            );
        }

        res.json({
            message: "Answer saved successfully",
            answer: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to save answer"
        });
    }
};

const getAttempt = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT
                a.id,
                a.quiz_id,
                a.status,
                a.started_at,
                q.title,
                q.duration
             FROM attempts a
             JOIN quizzes q ON a.quiz_id = q.id
             WHERE a.id = $1
             AND a.user_id = $2`,
            [attemptId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Attempt not found"
            });
        }

        const attempt = result.rows[0];

        res.json({
            attempt: {
                id: attempt.id,
                quiz_id: attempt.quiz_id,
                status: attempt.status,
                started_at: attempt.started_at
            },
            quiz: {
                title: attempt.title,
                duration: attempt.duration
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch attempt"
        });
    }
};
const submitQuiz = async (req, res) => {
    const client = await pool.connect();

    try {
        const { attemptId } = req.params;
        const userId = req.user.id;

        await client.query("BEGIN");

        const attemptResult = await client.query(
            `SELECT
                a.id,
                a.quiz_id,
                a.started_at,
                q.passing_score,
                q.duration
             FROM attempts a
             JOIN quizzes q ON a.quiz_id = q.id
             WHERE a.id = $1
             AND a.user_id = $2
             AND a.status = 'IN_PROGRESS'`,
            [attemptId, userId]
        );

        if (attemptResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Active attempt not found"
            });
        }

        const attempt = attemptResult.rows[0];

        const result = await client.query(
            `SELECT
                COUNT(*)::int AS total_answered,
                COUNT(*) FILTER (WHERE is_correct = true)::int AS correct_answers,
                COUNT(*) FILTER (WHERE is_correct = false)::int AS incorrect_answers
             FROM answers
             WHERE attempt_id = $1`,
            [attemptId]
        );

        const stats = result.rows[0];

        const correctAnswers = stats.correct_answers;
        const incorrectAnswers = stats.incorrect_answers;
        const totalAnswered = stats.total_answered;

        const totalQuestionsResult = await client.query(
            `SELECT COUNT(*)::int AS total
             FROM questions
             WHERE quiz_id = $1`,
            [attempt.quiz_id]
        );

        const totalQuestions = totalQuestionsResult.rows[0].total;

        const unanswered = totalQuestions - totalAnswered;

        const percentage =
            totalQuestions > 0
                ? (correctAnswers / totalQuestions) * 100
                : 0;

        const passed =
            percentage >= Number(attempt.passing_score);

        const completedAt = new Date();
        const timeTaken = Math.floor(
            (completedAt.getTime() - new Date(attempt.started_at).getTime()) / 1000
        );

        const updateResult = await client.query(
            `UPDATE attempts
             SET score = $1,
                 percentage = $2,
                 correct_answers = $3,
                 incorrect_answers = $4,
                 unanswered = $5,
                 time_taken = $6,
                 status = 'COMPLETED',
                 completed_at = $7
             WHERE id = $8
             RETURNING *`,
            [
                correctAnswers,
                percentage.toFixed(2),
                correctAnswers,
                incorrectAnswers,
                unanswered,
                timeTaken,
                completedAt,
                attemptId
            ]
        );

        await client.query("COMMIT");

        res.json({
            message: "Quiz submitted successfully",
            result: {
                attempt_id: attemptId,
                score: correctAnswers,
                percentage: Number(percentage.toFixed(2)),
                correct_answers: correctAnswers,
                incorrect_answers: incorrectAnswers,
                unanswered,
                passed
            }
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error(error);

        res.status(500).json({
            message: "Failed to submit quiz"
        });
    } finally {
        client.release();
    }
};
const getAttemptResult = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const userId = req.user.id;

        const attemptResult = await pool.query(
            `SELECT
                a.id,
                a.quiz_id,
                a.score,
                a.percentage,
                a.correct_answers,
                a.incorrect_answers,
                a.unanswered,
                a.time_taken,
                a.status,
                a.started_at,
                a.completed_at,
                q.title,
                q.passing_score
             FROM attempts a
             JOIN quizzes q ON a.quiz_id = q.id
             WHERE a.id = $1
             AND a.user_id = $2`,
            [attemptId, userId]
        );

        if (attemptResult.rows.length === 0) {
            return res.status(404).json({
                message: "Attempt not found"
            });
        }

        const attempt = attemptResult.rows[0];

        if (attempt.status !== "COMPLETED") {
            return res.status(400).json({
                message: "Quiz has not been submitted yet"
            });
        }

        const passed =
            Number(attempt.percentage) >= Number(attempt.passing_score);

        res.json({
            result: {
                attempt_id: attempt.id,
                quiz_id: attempt.quiz_id,
                quiz_title: attempt.title,
                score: attempt.score,
                percentage: Number(attempt.percentage),
                correct_answers: attempt.correct_answers,
                incorrect_answers: attempt.incorrect_answers,
                unanswered: attempt.unanswered,
                time_taken: attempt.time_taken,
                passing_score: attempt.passing_score,
                passed,
                started_at: attempt.started_at,
                completed_at: attempt.completed_at
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch result"
        });
    }
};

const getAttemptQuestions = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const userId = req.user.id;

        const attemptResult = await pool.query(
            `SELECT id, quiz_id
             FROM attempts
             WHERE id = $1
             AND user_id = $2
             AND status = 'IN_PROGRESS'`,
            [attemptId, userId]
        );

        if (attemptResult.rows.length === 0) {
            return res.status(404).json({
                message: "Active attempt not found"
            });
        }

        const quizId = attemptResult.rows[0].quiz_id;

        const questionsResult = await pool.query(
            `SELECT
                q.id,
                q.question_text,
                q.marks,
                q.explanation,
                q.difficulty,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', o.id,
                            'option_text', o.option_text
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
            questions: questionsResult.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch attempt questions"
        });
    }
};

const getDetailedResult = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const userId = req.user.id;

        const attemptResult = await pool.query(
            `SELECT
                a.id,
                a.quiz_id,
                a.status,
                q.title
             FROM attempts a
             JOIN quizzes q ON a.quiz_id = q.id
             WHERE a.id = $1
             AND a.user_id = $2`,
            [attemptId, userId]
        );

        if (attemptResult.rows.length === 0) {
            return res.status(404).json({
                message: "Attempt not found"
            });
        }

        const attempt = attemptResult.rows[0];

        if (attempt.status !== "COMPLETED") {
            return res.status(400).json({
                message: "Quiz has not been submitted yet"
            });
        }

        const result = await pool.query(
            `SELECT
                q.id AS question_id,
                q.question_text,
                q.explanation,
                q.marks,

                a.selected_option_id,

                selected.option_text AS selected_answer,

                correct.id AS correct_option_id,
                correct.option_text AS correct_answer,

                a.is_correct

             FROM questions q

             LEFT JOIN answers a
                ON q.id = a.question_id
                AND a.attempt_id = $1

             LEFT JOIN options selected
                ON selected.id = a.selected_option_id

             LEFT JOIN options correct
                ON correct.question_id = q.id
                AND correct.is_correct = true

             WHERE q.quiz_id = $2

             ORDER BY q.id`,
            [attemptId, attempt.quiz_id]
        );

        res.json({
            attempt: {
                id: attempt.id,
                quiz_id: attempt.quiz_id,
                quiz_title: attempt.title,
                status: attempt.status
            },
            questions: result.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch detailed result"
        });
    }
};

module.exports = {
    startQuiz,
    submitAnswer,
    getAttempt,
    submitQuiz,
    getAttemptResult,
    getDetailedResult,
    getAttemptQuestions
};