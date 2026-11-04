const { expressjwt } = require('express-jwt');
const config = require('config');
const { User } = require('../models/relationals');

const verifyToken = expressjwt({
  secret: config.get('jwt.secret'),
  algorithms: ['HS256'],
  issuer: config.get('jwt.issuer'),
  audience: config.get('jwt.audience')
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
          message: req.__('common.unauthorized')
        });
      }

      const user = await User.findByPk(req.auth.sub);

      if (!user || !user.active) {
        return res.status(401).json({
          message: req.__('common.unauthorized')
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
