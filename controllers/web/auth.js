const jwt = require('jsonwebtoken');
const authService = require('../../services/auth.service');

const {
  cookieOptions,
  safeNext
} = require('../../utils/web-session');

function renderLogin(req, res, status, options = {}) {
  return res.status(status).render('auth/login', {
    title: req.__('ssr.auth.title'),
    description: req.__('ssr.auth.description'),
    email: '',
    errors: {},
    loginError: null,
    nextUrl: '/',
    ...options
  });
}

function showLogin(req, res) {
  res.set('Cache-Control', 'no-store');

  return renderLogin(req, res, 200, {
    nextUrl: safeNext(req.query.next)
  });
}

async function login(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');

    const body = req.body || {};

    const email = typeof body.email === 'string'
      ? body.email.trim()
      : '';

    const password = body.password;
    const nextUrl = safeNext(body.next);

    const errors = {};

    if (
      !email ||
      email.length > 150 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      errors.email = req.__('ssr.auth.invalidEmail');
    }

    if (typeof password !== 'string' || !password) {
      errors.password = req.__('ssr.auth.passwordRequired');
    }

    if (Object.keys(errors).length > 0) {
      return renderLogin(req, res, 400, {
        email,
        errors,
        nextUrl
      });
    }

    const result = await authService.login(email, password);

    if (!result.success) {
      return renderLogin(req, res, result.status, {
        email,
        nextUrl,
        loginError: req.__(result.messageKey)
      });
    }

    const payload = jwt.decode(result.token);

    res.cookie('access_token', result.token, {
      ...cookieOptions(req),
      expires: new Date(payload.exp * 1000)
    });

    return res.redirect(nextUrl);

  } catch (error) {
    return next(error);
  }
}

function logout(req, res) {
  res.clearCookie('access_token', cookieOptions(req));

  return res.redirect('/');
}

module.exports = {
  showLogin,
  login,
  logout
};