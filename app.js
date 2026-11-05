const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const { expressjwt } = require('express-jwt');
const i18n = require('./config/i18n');
const config = require('config');
const errorHandler = require('./middlewares/error-handler');

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

app.use(i18n.init);

app.use((req, res, next) => {
  const queryLang = typeof req.query.lang === 'string' ? req.query.lang : null;
  const headerLang = req.get('accept-language')?.split(',')[0];
  const requested = queryLang || headerLang || defaultLocale;
  const base = requested.trim().toLowerCase().split(/[;-]/)[0];
  const locale = ['es', 'en'].includes(base) ? base : defaultLocale;

  i18n.setLocale(req, locale);
  next();
});

app.use(expressjwt({
  secret: config.get('jwt.secret'),
  algorithms: ['HS256'],
  issuer: config.get('jwt.issuer'),
  audience: config.get('jwt.audience')
}).unless({
  path: ['/', '/health', '/api/auth/login']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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

app.use((req, res, next) => {
  next(createError(404));
});

app.use(errorHandler);

module.exports = app;