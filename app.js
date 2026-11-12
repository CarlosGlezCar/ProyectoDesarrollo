require('dotenv').config();

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const { expressjwt } = require('express-jwt');
const i18n = require('./config/i18n');

const indexRouter = require('./routes/api/index');
const usersRouter = require('./routes/api/users');
const authRouter = require('./routes/api/auth');
const customersRouter = require('./routes/api/customers');
const inventoryRouter = require('./routes/api/inventory');
const ordersRouter = require('./routes/api/orders');
const permissionsRouter = require('./routes/api/permissions');
const productsRouter = require('./routes/api/products');
const rolesRouter = require('./routes/api/roles');
const variantsRouter = require('./routes/api/variants');
const indexWebRouter = require('./routes/web/index');

const app = express();

const secret = "e890eb5d680cb1d28ddd72d674e92eff8c36732f";
//app.use(expressjwt({ secret, algorithms:["HS256"]}).unless({path:['/api/auth/login']})); //lo copie al cual como lo tiene el profe, puede que requiera cambio

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

app.use('/', indexWebRouter);
app.use('/health', indexRouter);
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

// error handler
app.use(function(err, req, res, next) {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
        message: 'Unauthorized'
    });
  }
  const status = err.status || 500;

  if (req.originalUrl.startsWith('/api')) {
   return res.status(status).json({ message: err.message, data: null });
  }
  
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
