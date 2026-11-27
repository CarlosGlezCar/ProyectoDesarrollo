const { expressjwt } = require('express-jwt');
const { User } = require('../models/sql');
const config = require('config');

const { safeUser } = require('../services/auth.service');

const {
  cookieOptions,
  safeNext,
  isApi
} = require('../utils/web-session');

const verifyToken = expressjwt({
  secret: config.get('jwt.secret'),
  algorithms: ['HS256'],
  issuer: config.get('jwt.issuer'),
  audience: config.get('jwt.audience'),

  getToken: (req) => {
    const header = req.headers.authorization;

    if (header) {
      const match = header.match(/^Bearer\s+(\S+)$/i);
      return match ? match[1] : undefined;
    }

    if (!isApi(req)) {
      return req.cookies?.access_token;
    }

    return undefined;
  }
});

function authenticateRequest(req, res, next, optional = false) {
  const apiRequest = isApi(req);

  function unauthorized(err) {
    if (apiRequest) {
      if (err) return next(err);

      return res.status(401).json({
        message: req.__('common.unauthorized'),
        data: null
      });
    }

    res.clearCookie('access_token', cookieOptions(req));

    if (optional) {
      return next();
    }

    const destination = safeNext(
      req.method === 'GET' ? req.originalUrl : '/admin'
    );

    return res.redirect(
      '/login?next=' + encodeURIComponent(destination)
    );
  }

  return verifyToken(req, res, async (err) => {
    if (err) {
      if (err.name === 'UnauthorizedError') {
        return unauthorized(err);
      }

      return next(err);
    }

    try {
      if (
        !req.auth ||
        typeof req.auth.sub !== 'string' ||
        req.auth.sub.length === 0
      ) {
        return unauthorized();
      }

      const user = await User.findByPk(req.auth.sub);

      if (!user || !user.active) {
        return unauthorized();
      }

      req.user = user;

      if (!apiRequest) {
        res.locals.currentUser = safeUser(user);
        res.set('Cache-Control', 'no-store');
      }

      return next();

    } catch (error) {
      return next(error);
    }
  });
}

function authenticate(req, res, next) {
  return authenticateRequest(req, res, next);
}

authenticate.optional = function (req, res, next) {
  if (!req.cookies?.access_token) {
    return next();
  }

  return authenticateRequest(req, res, next, true);
};

module.exports = authenticate;