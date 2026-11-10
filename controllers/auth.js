const jwt = require('jsonwebtoken');
const config = require('config');
const { Buffer } = require('node:buffer');
const { User } = require('../models/sql');
const { verifyPassword } = require('../utils/passwords');

function safeUser(user) {
  if (!user) return null;
  const data = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
  delete data.password;
  delete data.password_hash;
  delete data.salt_key;
  return data;
}

function signToken(user) {
  return jwt.sign(
    { sub: String(user.id) },
    config.get('jwt.secret'),
    {
      expiresIn: config.get('jwt.expiresIn'),
      issuer: config.get('jwt.issuer'),
      audience: config.get('jwt.audience'),
      algorithm: 'HS256'
    }
  );
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || !email.trim() ||
        typeof password !== 'string' || !password) {
      return res.status(400).json({
        message: req.__('auth.credentialsRequired'),
        data: null
      });
    }

    if (Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(401).json({
        message: req.__('auth.invalidCredentials'),
        data: null
      });
    }

    const user = await User.findOne({ where: { email: email.trim() } });
    if (!user || !user.active ||
        !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({
        message: req.__('auth.invalidCredentials'),
        data: null
      });
    }

    return res.status(200).json({
      message: req.__('auth.loginSuccessful'),
      data: {
        token: signToken(user),
        tokenType: 'Bearer',
        expiresIn: config.get('jwt.expiresIn')
      }
    });
  } catch (err) {
    return next(err);
  }
}

function me(req, res) {
  return res.status(200).json({
    message: req.__('auth.profileRetrieved'),
    data: safeUser(req.user)
  });
}

module.exports = { login, me };
