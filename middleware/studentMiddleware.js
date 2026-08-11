const studentMiddleware = (req, res, next) => {
    if (req.user.role !== "STUDENT") {
        return res.status(403).json({
            message: "Student access required"
        });
    }

    next();
};

module.exports = studentMiddleware;