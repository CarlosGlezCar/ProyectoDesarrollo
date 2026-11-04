const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const i18n = require('./config/i18n');

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

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Logging de solicitudes HTTP (se desactiva en pruebas)
   if (app.get('env') !== 'test') {
     app.use(logger(app.get('env') === 'production' ? 'combined' : 'dev'));
   }
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(i18n.init);
app.use((req, res, next) => {
  const queryLang =
    typeof req.query.lang === 'string'
      ? req.query.lang
      : null;

  const headerLang = req.get('accept-language')
    ?.split(',')[0];

  const requested = queryLang ||
    headerLang ||
    'es';

  const base = requested
    .trim()
    .toLowerCase()
    .split('-')[0];

  const locale = ['es', 'en'].includes(base)
    ? base
    : 'es';

  i18n.setLocale(req, locale);
  next();
});

app.use('/', indexRouter);
app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/permissions', permissionsRouter);
app.use('/api/products', productsRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/variants', variantsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});


// Error handler
app.use(function(err, req, res, next) {
  const status = err.status || 500;

  const errorKey = status === 404
    ? 'views.error.notFound'
    : 'views.error.generic';

  res.locals.title = req.__('views.error.title');
  res.locals.message = req.__(errorKey);

  // Indicar el idioma de la página
  res.locals.locale = req.getLocale();

  res.locals.error =
    req.app.get('env') === 'development'
      ? err
      : {};

  res.status(status);
  res.render('error');
});

module.exports = app;
