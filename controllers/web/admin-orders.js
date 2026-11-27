
const createError = require('http-errors');

const orderService = require('../../services/order.service');
const { isMongoId } = require('../../utils/validation');

const {
  ORDER_STATUSES,
  OrderServiceError
} = orderService;

// Validar identificador MongoDB
function getOrderId(req) {
  if (!isMongoId(req.params.id)) {
    throw createError(404);
  }

  return req.params.id;
}

// Mostrar detalle de un pedido
function renderDetail(req, res, order, {
  status = 200,
  errors = {},
  values = {
    status: '',
    note: ''
  }
} = {}) {
  return res.status(status).render('admin/orders/detail', {
    title: req.__('ssr.adminOrders.detailTitle'),
    description: req.__('ssr.adminOrders.detailDescription'),
    order,
    errors,
    values,
    allowedStatuses: orderService.getAllowedStatuses(order)
  });
}

// Mensaje temporal de confirmacion
function setFlash(req, res) {
  res.cookie('flash', JSON.stringify({
    type: 'success',
    message: req.__('ssr.adminOrders.updated')
  }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.app.get('env') === 'production',
    maxAge: 60 * 1000,
    path: '/'
  });
}

// GET /admin/orders
async function listOrders(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');

    const status = typeof req.query.status === 'string'
      ? req.query.status
      : '';

    const invalid =
      (req.query.status !== undefined &&
        typeof req.query.status !== 'string') ||
      (status !== '' && !ORDER_STATUSES.includes(status));

    const orders = invalid
      ? []
      : await orderService.listAdminOrders(status);

    return res.status(invalid ? 400 : 200)
      .render('admin/orders/index', {
        title: req.__('ssr.adminOrders.title'),
        description: req.__('ssr.adminOrders.description'),
        orders,
        statuses: ORDER_STATUSES,
        selectedStatus: status,
        error: invalid
          ? req.__('ssr.adminOrders.invalidStatus')
          : null
      });

  } catch (err) {
  return next(err);
}
}

// GET /admin/orders/:id
async function showOrder(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');

    const order = await orderService.findAdminOrder(
      getOrderId(req)
    );

    if (!order) {
      return next(createError(404));
    }

    return renderDetail(req, res, order);

  } catch (err) {
  return next(err);
  }
}

// POST /admin/orders/:id/status
async function updateStatus(req, res, next) {
  const values = {
    status: typeof req.body?.status === 'string'
      ? req.body.status.trim()
      : '',

    note: typeof req.body?.note === 'string'
      ? req.body.note.trim()
      : ''
  };

  try {
    res.set('Cache-Control', 'no-store');

    const id = getOrderId(req);

    const order = await orderService.findAdminOrder(id);

    if (!order) {
      return next(createError(404));
    }

    const errors = {};

    if (!ORDER_STATUSES.includes(values.status)) {
      errors.status = req.__(
        'ssr.adminOrders.invalidStatus'
      );

    } else if (
      !orderService.getAllowedStatuses(order)
        .includes(values.status)
    ) {
      errors.status = req.__(
        'ssr.adminOrders.invalidTransition'
      );
    }

    if (
      values.note.length > 250 ||
      (req.body?.note !== undefined &&
        typeof req.body.note !== 'string')
    ) {
      errors.note = req.__(
        'ssr.adminOrders.invalidNote'
      );
    }

    if (Object.keys(errors).length > 0) {
      return renderDetail(req, res, order, {
        status: 400,
        errors,
        values
      });
    }

    try {
      await orderService.changeOrderStatus(id, {
        status: values.status,
        note: values.note,

        // Se obtiene desde la sesion, no del formulario
        changedById: Number(req.user.id)
      });

    } catch (err) {
      if (
        err instanceof OrderServiceError &&
        [400, 409].includes(err.status)
      ) {
        const currentOrder =
          await orderService.findAdminOrder(id);

        if (!currentOrder) {
          return next(createError(404));
        }

        return renderDetail(req, res, currentOrder, {
          status: err.status,
          errors: {
            general: req.__(err.messageKey)
          },
          values
        });
      }

      if (err instanceof OrderServiceError) {
        return next(createError(err.status));
      }

      if (err.name === 'ValidationError') {
        return renderDetail(req, res, order, {
          status: 400,
          errors: {
            general: req.__('ssr.adminOrders.invalidStatus')
          },
          values
        });
      }

      throw err;
    }

    setFlash(req, res);

    return res.redirect(302, '/admin/orders/' + id);

  } catch (err) {
  return next(err);
}
}

module.exports = {
  listOrders,
  showOrder,
  updateStatus
};