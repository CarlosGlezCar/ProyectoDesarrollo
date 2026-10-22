const jwt = require('jsonwebtoken');
const process = require('node:process');
const { Buffer } = require('node:buffer');
const { User } = require('../models/relationals');
const { verifyPassword } = require('../utils/passwords');

function signToken(user){
    const jwtUser ={
        expiresIn: "15m",
        issuer: "stride-co",
        audience: "stride-co-api",
        algorithm: "HS256"
    };

    const secret = "e890eb5d680cb1d28ddd72d674e92eff8c36732f"; //la frase fue "hayclaseleviernes"
    return jwt.sign({ sub: String(user.id)}), secret, jwtUser;
}

async function login(req, res, next) {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== 'string' ||
            email.trim().length === 0 ||
            typeof password !== 'string' ||
            password.length === 0
        ) {
            return res.status(400).json({
                message: 'Email and password are required'
            });
        }

        if (Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        const user = await User.findOne({ where: { email } });

        if (!user || !user.active) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        const validPassword = await verifyPassword(
            password,
            user.password_hash
        );

        if (!validPassword) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        const token = jwt.sign(
            { sub: String(user.id) },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN,
                issuer: process.env.JWT_ISSUER,
                audience: process.env.JWT_AUDIENCE,
                algorithm: 'HS256'
            }
        );

        res.json({
            message: "Login successful",
            data:{
                token: signToken(user),
                tokenType: "Bearer",
                expiresIn: "15m"
            }
        })

        return res.status(200).json({ token });
    } catch (err) {
        next(err);
    }
}

function me(req, res) {
    return res.status(200).json(req.user);
}

module.exports = { login, me };