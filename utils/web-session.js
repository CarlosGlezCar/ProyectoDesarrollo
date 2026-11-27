const { URL } = require('node:url');

function cookieOptions(req) {
  return {
    httpOnly: true,
    secure: req.app.get('env') === 'production',
    sameSite: 'lax',
    path: '/'
  };
}

function safeNext(value) {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return '/';
  }

  try {
    const origin = 'http://stride.local';
    const url = new URL(value, origin);

    if (url.origin !== origin) {
      return '/';
    }

    const allowed =
      url.pathname === '/' ||
      url.pathname === '/admin' ||
      url.pathname.startsWith('/admin/') ||
      url.pathname === '/checkout' ||
      url.pathname === '/my/orders' ||
      url.pathname.startsWith('/my/orders/');

    return allowed
      ? url.pathname + url.search
      : '/';

  } catch {
    return '/';
  }
}

function isApi(req) {
  const path = req.originalUrl.split('?')[0];

  return path === '/api' || path.startsWith('/api/');
}

module.exports = {
  cookieOptions,
  safeNext,
  isApi
};