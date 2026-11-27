const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const i18n = require('./config/i18n');
const config = require('config');
const errorHandler = require('./middlewares/error-handler');
const webAuthRouter = require('./routes/web/auth');
const webAdminRouter = require('./routes/web/admin');
const webStoreRouter = require('./routes/web/store');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const customersRouter = require('./routes/customers');
const inventoryRouter = require('./routes/inventory');
const ordersRouter = require('./routes/orders');
const permissionsRouter = require('./routes/permissions');
const productsRouter = require('./routes/products');
const rolesRouter = require('./routes/roles');
const variantsRouter = require('./routes/variants');

const app = express();
const defaultLocale = config.get('i18n.defaultLocale');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

if (app.get('env') !== 'test') {
  app.use(logger(app.get('env') === 'production' ? 'combined' : 'dev'));
}

app.use(cookieParser());

app.use(i18n.init);

app.use((req, res, next) => {
  const isApi = req.path === '/api' || req.path.startsWith('/api/');

  const queryLang = typeof req.query.lang === 'string'
    ? req.query.lang
    : null;

  const cookieLang = !isApi && ['es', 'en'].includes(req.cookies.lang)
    ? req.cookies.lang
    : null;

  const headerLang = req.get('accept-language')?.split(',')[0];

  const requested =
    queryLang || cookieLang || headerLang || defaultLocale;

  const base = requested.trim().toLowerCase().split(/[;-]/)[0];

  const locale = ['es', 'en'].includes(base)
    ? base
    : defaultLocale;

  i18n.setLocale(req, locale);

  if (!isApi && queryLang && ['es', 'en'].includes(base)) {
    res.cookie('lang', locale, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.app.get('env') === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
  }

  function languageLink(language) {
    const query = new URLSearchParams(
      req.originalUrl.split('?')[1] || ''
    );

    query.set('lang', language);

    return `?${query.toString()}`;
  }

  res.locals.locale = locale;
  res.locals.__ = (...args) => req.__(...args);

  res.locals.languageLinks = {
    es: languageLink('es'),
    en: languageLink('en')
  };

res.locals.currentUser = null;
res.locals.can = () => false;

// Mensajes temporales de una sola lectura
res.locals.flash = null;

const flashCookie = req.cookies?.flash;

if (flashCookie) {
    try {
        const flash = JSON.parse(flashCookie);

        if (
            flash &&
            ['success', 'error'].includes(flash.type) &&
            typeof flash.message === 'string'
        ) {
            res.locals.flash = flash;
        }
    } catch {
        // Ignorar cookies de mensajes inválidas
    }

    res.clearCookie('flash', {
        path: '/'
    });
}

  res.locals.formatMoney = (amount) =>
    new Intl.NumberFormat(
      locale === 'es' ? 'es-MX' : 'en-US',
      {
        style: 'currency',
        currency: 'MXN'
      }
    ).format(Number(amount));

  res.locals.formatDate = (date) =>
    new Intl.DateTimeFormat(
      locale === 'es' ? 'es-MX' : 'en-US'
    ).format(new Date(date));

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/', webAuthRouter);
app.use('/', webStoreRouter);
app.use('/admin', webAdminRouter);
app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/permissions', permissionsRouter);
app.use('/api/products', productsRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/variants', variantsRouter);

app.use((req, res, next) => {
  next(createError(404));
});

app.use(errorHandler);

module.exports = app;