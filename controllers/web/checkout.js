
const createError = require('http-errors');
const { Types } = require('mongoose');

const cartService = require('../../services/cart.service');
const checkoutService = require('../../services/checkout.service');
const orderService = require('../../services/order.service');

const { CheckoutError } = checkoutService;
const { isMongoId } = require('../../utils/validation');
const { cookieOptions } = require('../../utils/web-session');

const addressFields = [
  'street',
  'number',
  'city',
  'state',
  'postalCode',
  'country'
];

// Obtener los datos de la bolsa
function getItems(req) {
  return cartService.readCart(req.cookies?.cart);
}

// Obtener el identificador de compra guardado
function getAttemptId(req) {
  const raw = req.cookies?.checkout_attempt;

  if (typeof raw !== 'string') {
    return null;
  }

  const [userId, orderId] = raw.split(':');

  if (
    userId !== String(req.user.id) ||
    !isMongoId(orderId)
  ) {
    return null;
  }

  return orderId;
}

// Guardar el identificador de compra
function saveAttempt(req, res, orderId) {
  res.cookie(
    'checkout_attempt',
    `${req.user.id}:${orderId}`,
    {
      ...cookieOptions(req),
      maxAge: 24 * 60 * 60 * 1000
    }
  );
}

// Limpiar cookies despues de una compra exitosa
function clearCheckout(req, res) {
  res.clearCookie('cart', cookieOptions(req));

  res.clearCookie(
    'checkout_attempt',
    cookieOptions(req)
  );
}

// Leer el formulario
function readValues(body = {}) {
  const read = field =>
    typeof body[field] === 'string'
      ? body[field].trim()
      : '';

  const address = {};

  for (const field of addressFields) {
    address[field] = read(field);
  }

  return {
    address,
    paymentMethod: read('paymentMethod')
  };
}

// Validar los campos
function validateValues(values, req) {
  const errors = {};

  for (const field of addressFields) {
    if (
      !values.address[field] ||
      values.address[field].length > 150
    ) {
      errors[field] = req.__(
        'ssr.checkout.invalidField'
      );
    }
  }

  if (
    !['cash', 'card', 'transfer']
      .includes(values.paymentMethod)
  ) {
    errors.paymentMethod = req.__(
      'ssr.checkout.invalidPayment'
    );
  }

  return errors;
}

// Mostrar el formulario o una compra pendiente
async function renderCheckout(
  req,
  res,
  {
    status = 200,
    errors = {},
    values = {
      address: { country: 'México' },
      paymentMethod: 'cash'
    },
    orderId = null,
    pending = null
  } = {}
) {
  res.set('Cache-Control', 'no-store');

  const cart = pending
    ? null
    : await cartService.getCart(getItems(req));

  const checkoutId = pending
    ? pending.order_id
    : orderId || getAttemptId(req) ||
      new Types.ObjectId().toString();

  saveAttempt(req, res, checkoutId);

  return res.status(status).render('store/checkout', {
    title: req.__('ssr.checkout.title'),
    description: req.__('ssr.checkout.description'),
    cart,
    orderId: checkoutId,
    pending,
    values,
    errors
  });
}

// GET /checkout
async function showCheckout(req, res, next) {
  try {
    const userId = Number(req.user.id);

    const pending =
      await checkoutService.getPendingAttempt(userId);

    if (pending) {
      return await renderCheckout(req, res, {
        pending
      });
    }

    const attemptId = getAttemptId(req);

    if (attemptId) {
      const attempt = await checkoutService.getOwnAttempt(
        attemptId,
        userId
      );

      if (attempt?.status === 'completed') {
        clearCheckout(req, res);

        return res.redirect(
          '/my/orders/' + attemptId + '/confirmation'
        );
      }
    }

    if (getItems(req).length === 0) {
      return res.redirect('/cart');
    }

    return await renderCheckout(req, res);

  } catch (err) {
    return next(err);
  }
}

// POST /checkout
async function placeOrder(req, res, next) {
  const orderId = req.body?.orderId;
  const userId = Number(req.user.id);
  const values = readValues(req.body || {});

  try {
    if (!isMongoId(orderId)) {
      return next(createError(400));
    }

    const existing =
      await checkoutService.getOwnAttempt(orderId, userId);

    // Un intento nuevo debe corresponder al formulario
    // de checkout que se genero para esta sesion.
    if (!existing && orderId !== getAttemptId(req)) {
      return next(createError(400));
    }

    // Validar campos solo para una compra nueva
    if (!existing) {
      const errors = validateValues(values, req);

      if (Object.keys(errors).length > 0) {
        return await renderCheckout(req, res, {
          status: 400,
          values,
          errors,
          orderId
        });
      }
    }

    // El servicio reutiliza los datos guardados cuando
    // se trata de una compra previamente reservada.
    const order = await checkoutService.placeOrder({
      orderId,
      userId,
      items: getItems(req),
      address: values.address,
      paymentMethod: values.paymentMethod
    });

    clearCheckout(req, res);

    return res.redirect(
      302,
      '/my/orders/' + String(order._id) + '/confirmation'
    );

  } catch (err) {
    if (err instanceof CheckoutError) {
      if (err.status === 400 || err.status === 409) {
        try {
          const pending =
            await checkoutService.getPendingAttempt(userId);

          return await renderCheckout(req, res, {
            status: err.status,
            values,
            orderId,
            pending,
            errors: {
              general: req.__(err.messageKey)
            }
          });

        } catch (renderError) {
          return next(renderError);
        }
      }

      return next(createError(err.status));
    }

    return next(err);
  }
}

// GET /my/orders/:id/confirmation
async function confirmation(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');

    if (!isMongoId(req.params.id)) {
      return next(createError(404));
    }

    const result = await orderService.findOwnOrder(
      req.params.id,
      Number(req.user.id)
    );

    if (!result.order) {
      return next(createError(result.status));
    }

    return res.render('store/confirmation', {
      title: req.__('ssr.checkout.confirmationTitle'),
      description: req.__('ssr.checkout.confirmationDescription'),
      order: result.order
    });

  } catch (err) {
    return next(err);
  }
}

module.exports = {
  showCheckout,
  placeOrder,
  confirmation
};