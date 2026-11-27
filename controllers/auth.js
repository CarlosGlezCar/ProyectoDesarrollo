const authService = require('../services/auth.service');

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    const result = await authService.login(email, password);

    if (!result.success) {
      return res.status(result.status).json({
        message: req.__(result.messageKey),
        data: null
      });
    }

    return res.status(200).json({
      message: req.__(result.messageKey),
      data: {
        token: result.token,
        tokenType: 'Bearer',
        expiresIn: result.expiresIn
      }
    });

  } catch (err) {
    return next(err);
  }
}

function me(req, res) {
  return res.status(200).json({
    message: req.__('auth.profileRetrieved'),
    data: authService.safeUser(req.user)
  });
}

module.exports = {
  login,
  me
};