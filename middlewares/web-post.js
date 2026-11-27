const createError = require('http-errors');
const { URL } = require('node:url');

function webPost(req, res, next) {
  const fetchSite = req.get('sec-fetch-site');

  // Rechazar solicitudes de otros sitios y subdominios
  if (
    fetchSite === 'cross-site' ||
    fetchSite === 'same-site'
  ) {
    return next(createError(403));
  }

  const origin = req.get('origin');
  const referer = req.get('referer');

  const protocol =
    req.app.get('env') === 'production'
      ? 'https'
      : req.protocol;

  try {
    const expectedOrigin = new URL(
      `${protocol}://${req.get('host')}`
    ).origin;

    if (origin) {
      if (new URL(origin).origin !== expectedOrigin) {
        return next(createError(403));
      }
    } else if (referer) {
      if (new URL(referer).origin !== expectedOrigin) {
        return next(createError(403));
      }
    }
  } catch {
    return next(createError(403));
  }

  return next();
}

module.exports = webPost;