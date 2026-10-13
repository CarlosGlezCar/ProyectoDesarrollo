const { expressjwt } = require('express-jwt');
const process = require('node:process');
const { User } = require('../models/relationals');

const verifyToken = expressjwt({
    secret: process.env.JWT_SECRET,
    algorithms: ['HS256'],
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE
});

function authenticate(req, res, next) {
    verifyToken(req, res, async (err) => {
        if (err) {
            return next(err);
        }

        try {
            if (
                !req.auth ||
                typeof req.auth.sub !== 'string' ||
                req.auth.sub.length === 0
            ) {
                return res.status(401).json({
                    message: 'Unauthorized'
                });
            }

            const user = await User.findByPk(req.auth.sub);

            if (!user || !user.active) {
                return res.status(401).json({
                    message: 'Unauthorized'
                });
            }

            req.user = user;
            return next();
        } catch (error) {
            return next(error);
        }
    });
}

module.exports = authenticate;