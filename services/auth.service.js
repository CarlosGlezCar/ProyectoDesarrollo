const jwt = require('jsonwebtoken');
const config = require('config');
const { Buffer } = require('node:buffer');
const { User } = require('../models/sql');
const { verifyPassword } = require('../utils/passwords');

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

function safeUser(user) {
  if (!user) return null;

  const data = typeof user.toJSON === 'function'
    ? user.toJSON()
    : { ...user };

  delete data.password;
  delete data.password_hash;
  delete data.salt_key;

  return data;
}

async function login(email, password) {

  if (
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    !password
  ) {
    return {
      success: false,
      status: 400,
      messageKey: 'auth.credentialsRequired'
    };
  }

  if (Buffer.byteLength(password, 'utf8') > 72) {
    return {
      success: false,
      status: 401,
      messageKey: 'auth.invalidCredentials'
    };
  }

  const user = await User.findOne({
    where: {
      email: email.trim()
    }
  });

  if (
    !user ||
    !user.active ||
    !(await verifyPassword(password, user.password_hash))
  ) {
    return {
      success: false,
      status: 401,
      messageKey: 'auth.invalidCredentials'
    };
  }

  return {
    success: true,
    status: 200,
    messageKey: 'auth.loginSuccessful',
    token: signToken(user),
    expiresIn: config.get('jwt.expiresIn'),
    user: safeUser(user)
  };
}

module.exports = {
  login,
  safeUser
};