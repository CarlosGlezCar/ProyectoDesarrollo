const { Order, Customer } = require('../models/mongo');
const { User, Product } = require('../models/sql');
const { isMongoId, isPositiveInteger } = require('../utils/validation');
const webOrderStatusService = require('./web-order-status.service');

// Consulta compartida entre API y SSR
async function listOrders(
  filter = {},
  { recentLimit = null } = {}
) {
  const query = Order.find(filter);

  // Consulta reducida para el dashboard
  if (recentLimit !== null) {
    return query
      .sort({ createdAt: -1, _id: -1 })
      .limit(recentLimit)
      .select('_id totals.total statusHistory.status createdAt')
      .lean();
  }

  // Consulta original de la API
  return query.populate('customerId');
}

// Contar todos los pedidos
async function countOrders() {
  return Order.countDocuments({});
}

// Obtener los pedidos mas recientes
async function recentOrders(limit = 5) {
  return listOrders({}, {
    recentLimit: limit
  });
}

async function createOrder(data) {
  return Order.create(data);
}

// Consultar un pedido que pertenece al usuario
async function findOwnOrder(id, userId) {
  const order = await Order.findById(id);

  if (!order) {
    return { status: 404 };
  }

  const customer = await Customer.findById(
    order.customerId
  );

  if (
    !customer ||
    String(customer.userId) !== String(userId)
  ) {
    return { status: 403 };
  }

  return { order };
}

// Obtener exclusivamente los pedidos del usuario
async function listOwnOrders(userId) {
  const customers = await Customer.find({
    userId
  }).select('_id');

  const customerIds = customers.map(
    customer => customer._id
  );

  if (customerIds.length === 0) {
    return [];
  }

  const orders = await listOrders({
    customerId: {
      $in: customerIds
    }
  });

  // Mostrar primero los pedidos mas recientes
  return orders.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}


const ORDER_STATUSES = [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled'
];

// Transiciones permitidas
const STATUS_TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: []
};

class OrderServiceError extends Error {
  constructor(status, messageKey) {
    super(messageKey);
    this.name = 'OrderServiceError';
    this.status = status;
    this.messageKey = messageKey;
  }
}

// Obtener el estado actual de un pedido
function getCurrentStatus(order) {
  const history = order.statusHistory || [];

  return history.length
    ? history[history.length - 1].status
    : 'unknown';
}

// Obtener las transiciones disponibles
function getAllowedStatuses(order) {
  return STATUS_TRANSITIONS[getCurrentStatus(order)] || [];
}

// Listar pedidos y filtrar por su ultimo estado
async function listAdminOrders(status = '') {
  const filter = {};

  if (status) {
    if (!ORDER_STATUSES.includes(status)) {
      throw new OrderServiceError(
        400,
        'ssr.adminOrders.invalidStatus'
      );
    }

    filter.$expr = {
      $eq: [
        {
          $arrayElemAt: ['$statusHistory.status', -1]
        },
        status
      ]
    };
  }

  const orders = await listOrders(filter);

  return orders.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

// Obtener detalle incluyendo al cliente
async function findAdminOrder(id) {
  return Order.findById(id)
    .populate('customerId');
}

// Agregar una entrada al historial de estados
async function changeOrderStatus(id, {
  status,
  note = '',
  changedById
}) {
  if (
    !ORDER_STATUSES.includes(status) ||
    typeof note !== 'string' ||
    note.length > 250 ||
    !Number.isInteger(changedById) ||
    changedById <= 0
  ) {
    throw new OrderServiceError(
      400,
      'ssr.adminOrders.invalidStatus'
    );
  }

  const order = await Order.findById(id);

  if (!order) {
    throw new OrderServiceError(
      404,
      'common.notFound'
    );
  }

  const allowed = getAllowedStatuses(order);

  if (!allowed.includes(status)) {
    throw new OrderServiceError(
      400,
      'ssr.adminOrders.invalidTransition'
    );
  }

  const historyLength = order.statusHistory.length;

  const entry = {
    status,
    changedById,
    changedAt: new Date(),
    note: note.trim()
  };

  // Los pedidos web tienen reservas de inventario
  if (order.channel === 'web') {
    try {
      return await webOrderStatusService.changeWebOrderStatus(
        id,
        entry,
        historyLength,
        getCurrentStatus(order)
      );
    } catch (err) {
      if (
        err instanceof webOrderStatusService.WebOrderError
      ) {
        throw new OrderServiceError(
          err.status,
          err.messageKey
        );
      }

      throw err;
    }
  }

  // Actualizacion atomica: no sobrescribir el historial
  // ni aceptar cambios concurrentes sobre una version antigua
  const updated = await Order.findOneAndUpdate(
    {
      _id: id,

      [`statusHistory.${historyLength}`]: {
        $exists: false
      },

      [`statusHistory.${historyLength - 1}.status`]:
        getCurrentStatus(order)
    },
    {
      $push: {
        statusHistory: entry
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!updated) {
    throw new OrderServiceError(
      409,
      'ssr.adminOrders.concurrentUpdate'
    );
  }

  return updated;
}

// Comprueba que el cliente (MongoDB), el vendedor y los productos (PostgreSQL) existan.
async function checkOrderReferences(data) {
  if (!isMongoId(data.customerId)) {
    return { status: 400, key: 'common.invalidId' };
  }
  if (!(await Customer.exists({ _id: data.customerId }))) {
    return { status: 404, key: 'orders.customerNotFound' };
  }

  if (!isPositiveInteger(data.salesPersonId)) {
    return { status: 400, key: 'common.invalidData' };
  }
  const seller = await User.findByPk(data.salesPersonId);
  if (!seller || !seller.active) {
    return { status: 404, key: 'users.notFound' };
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    return { status: 400, key: 'orders.emptyItems' };
  }
  const productIds = [];
  for (const item of data.items) {
    if (!item || typeof item !== 'object' || !isPositiveInteger(item.productId)) {
      return { status: 400, key: 'common.invalidData' };
    }
    productIds.push(item.productId);
  }
  const uniqueIds = [...new Set(productIds)];
  const found = await Product.count({ where: { id: uniqueIds } });
  if (found !== uniqueIds.length) {
    return { status: 404, key: 'products.notFound' };
  }

  return null;
}

// Pedido tradicional de la API: conservar el contrato anterior.
async function createApiOrder(data, actorId) {
  const error = await checkOrderReferences(data);
  if (error) return { error };

  const order = await createOrder({
    ...data,
    statusHistory: [{ status: 'pending', changedById: actorId }]
  });
  await order.populate('customerId');
  return { order };
}

async function updateApiOrder(id, data, actorId) {
  const order = await Order.findById(id);
  if (!order) return { error: { status: 404, key: 'orders.notFound' } };
  if (order.channel === 'web') {
    return { error: { status: 409, key: 'orders.webOrderProtected' } };
  }

  if (Object.hasOwn(data, 'paymentMethod')) order.paymentMethod = data.paymentMethod;
  if (Object.hasOwn(data, 'shippingAddress')) order.shippingAddress = data.shippingAddress;
  if (Object.hasOwn(data, 'status')) {
    order.statusHistory.push({
      status: data.status,
      changedById: actorId,
      note: data.note
    });
  }

  await order.save();
  await order.populate('customerId');
  return { order };
}

async function deleteApiOrder(id) {
  const order = await Order.findOneAndDelete({
    _id: id,
    channel: { $ne: 'web' }
  });

  if (!order) {
    const existing = await Order.findById(id);
    if (existing && existing.channel === 'web') {
      return { error: { status: 409, key: 'orders.webOrderProtected' } };
    }
    return { error: { status: 404, key: 'orders.notFound' } };
  }

  return { order };
}

module.exports = {
  createApiOrder,
  updateApiOrder,
  deleteApiOrder,
  listOrders,
  countOrders,
  recentOrders,
  createOrder,
  findOwnOrder,
  listOwnOrders,

  // F11 - Administracion de pedidos
  ORDER_STATUSES,
  OrderServiceError,
  getAllowedStatuses,
  listAdminOrders,
  findAdminOrder,
  changeOrderStatus
};
