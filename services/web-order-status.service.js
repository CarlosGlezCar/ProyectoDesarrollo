
const {
  sequelize,
  CheckoutAttempt,
  OrderStatusOperation,
  Inventory
} = require('../models/sql');

const { Order } = require('../models/mongo');

const reservationService = require('./reservation.service');

const {
  calculateMovement
} = require('./inventory-movement.service');

class WebOrderError extends Error {
  constructor(messageKey) {
    super(messageKey);
    this.name = 'WebOrderError';
    this.status = 409;
    this.messageKey = messageKey;
  }
}

// Bloquear los cambios de estado del mismo pedido
async function lockAttempt(orderId, transaction) {
  const attempt = await CheckoutAttempt.findByPk(
    orderId,
    {
      transaction,
      lock: transaction.LOCK.UPDATE
    }
  );

  if (!attempt || attempt.status !== 'completed') {
    throw new WebOrderError(
      'ssr.adminOrders.checkoutNotCompleted'
    );
  }

  return attempt;
}

// Aplicar un movimiento de inventario
async function applyInventoryMovement(
  order,
  status,
  transaction
) {
  if (!['shipped', 'cancelled'].includes(status)) {
    return;
  }

  const reservations = await reservationService.findByOrder(
    String(order._id),
    transaction
  );

  // No modificar reservas historicas desconocidas
  if (
    reservations.length === 0 ||
    reservations.length !== order.items.length
  ) {
    throw new WebOrderError(
      'ssr.adminOrders.missingReservations'
    );
  }

  const quantities = new Map(
    order.items.map(item => [
      Number(item.variantId),
      Number(item.quantity)
    ])
  );

  // Validar que las reservas correspondan al pedido
  if (
    quantities.size !== reservations.length ||
    reservations.some(reservation =>
      reservation.status !== 'reserved' ||
      quantities.get(Number(reservation.variant_id)) !==
        Number(reservation.quantity)
    )
  ) {
    throw new WebOrderError(
      'ssr.adminOrders.missingReservations'
    );
  }

  // Mantener un orden estable de bloqueos
  const sorted = [...reservations].sort(
    (a, b) => a.variant_id - b.variant_id
  );

  for (const reservation of sorted) {

    const inventory = await Inventory.findOne({
      where: {
        variant_id: reservation.variant_id
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!inventory) {
      throw new WebOrderError(
        'ssr.adminOrders.missingReservations'
      );
    }

    const protectedReserved =
      await reservationService.reservedForVariant(
        reservation.variant_id,
        transaction
      );

    if (Number(inventory.reserved) < protectedReserved) {
      throw new WebOrderError(
        'ssr.adminOrders.inventoryConflict'
      );
    }

    let changes;

    try {
      changes = calculateMovement(
        Number(inventory.stock),
        Number(inventory.reserved),
        Number(reservation.quantity),
        status
      );
    } catch {
      throw new WebOrderError(
        'ssr.adminOrders.inventoryConflict'
      );
    }

    await inventory.update(changes, {
      transaction
    });

    await reservation.update({
      status: status === 'shipped'
        ? 'consumed'
        : 'released'
    }, {
      transaction
    });
  }
}

// Registrar la operacion y sus movimientos
async function prepareOperation(
  orderId,
  entry,
  expectedLength,
  expectedStatus
) {
  return sequelize.transaction(async transaction => {

    await lockAttempt(orderId, transaction);

    const pending = await OrderStatusOperation.findOne({
      where: {
        order_id: orderId,
        status: 'pending'
      },
      transaction
    });

    // Reutilizar la operacion pendiente
    // sin repetir los movimientos
    if (pending) {
      if (pending.entry.status !== entry.status) {
        throw new WebOrderError(
          'ssr.adminOrders.pendingOperation'
        );
      }

      return pending.history_index;
    }

    const order = await Order.findById(orderId);

    if (!order || order.channel !== 'web') {
      throw new WebOrderError(
        'ssr.adminOrders.concurrentUpdate'
      );
    }

    const history = order.statusHistory || [];

    const currentStatus = history.length
      ? history[history.length - 1].status
      : null;

    if (
      history.length !== expectedLength ||
      currentStatus !== expectedStatus
    ) {
      throw new WebOrderError(
        'ssr.adminOrders.concurrentUpdate'
      );
    }

    await applyInventoryMovement(
      order,
      entry.status,
      transaction
    );

    await OrderStatusOperation.create({
      order_id: orderId,
      history_index: expectedLength,
      previous_status: expectedStatus,

      entry: {
        ...entry,
        changedAt: new Date(entry.changedAt).toISOString()
      },

      status: 'pending'

    }, {
      transaction
    });

    return expectedLength;
  });
}

// Detectar si MongoDB ya recibio la entrada
function sameEntry(actual, expected) {
  return Boolean(actual) &&
    actual.status === expected.status &&
    Number(actual.changedById) ===
      Number(expected.changedById) &&
    new Date(actual.changedAt).getTime() ===
      new Date(expected.changedAt).getTime() &&
    (actual.note || '') === (expected.note || '');
}

// Confirmar una operacion en MongoDB
async function completeOperation(orderId, historyIndex) {
  return sequelize.transaction(async transaction => {

    await lockAttempt(orderId, transaction);

    const operation = await OrderStatusOperation.findOne({
      where: {
        order_id: orderId,
        history_index: historyIndex
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    let order = await Order.findById(orderId);

    if (!operation || !order || order.channel !== 'web') {
      throw new WebOrderError(
        'ssr.adminOrders.concurrentUpdate'
      );
    }

    const history = order.statusHistory || [];
    const index = Number(operation.history_index);
    const entry = operation.entry;

    // Si ya existe la misma entrada, no agregarla otra vez
    const alreadyApplied = sameEntry(
      history[index],
      entry
    );

    if (!alreadyApplied) {

      if (
        operation.status === 'completed' ||
        history.length !== index ||
        history[index - 1]?.status !==
          operation.previous_status
      ) {
        throw new WebOrderError(
          'ssr.adminOrders.concurrentUpdate'
        );
      }

      order = await Order.findOneAndUpdate(
        {
          _id: orderId,
          channel: 'web',

          [`statusHistory.${index}`]: {
            $exists: false
          },

          [`statusHistory.${index - 1}.status`]:
            operation.previous_status
        },

        {
          $push: {
            statusHistory: {
              ...entry,
              changedAt: new Date(entry.changedAt)
            }
          }
        },

        {
          new: true,
          runValidators: true
        }
      );

      if (!order) {
        throw new WebOrderError(
          'ssr.adminOrders.concurrentUpdate'
        );
      }
    }

    if (operation.status !== 'completed') {
      await operation.update({
        status: 'completed'
      }, {
        transaction
      });
    }

    return order;
  });
}

// Ejecutar el cambio de estado
async function changeWebOrderStatus(
  orderId,
  entry,
  expectedLength,
  expectedStatus
) {
  const index = await prepareOperation(
    orderId,
    entry,
    expectedLength,
    expectedStatus
  );

  return completeOperation(orderId, index);
}

// Consultar operaciones pendientes para recuperacion
async function listPendingOperations() {
  return OrderStatusOperation.findAll({
    where: {
      status: 'pending'
    },
    order: [['created_at', 'ASC']]
  });
}

module.exports = {
  WebOrderError,
  changeWebOrderStatus,
  completeOperation,
  listPendingOperations
};
