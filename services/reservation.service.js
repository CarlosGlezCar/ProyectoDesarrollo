const { OrderReservation } = require('../models/sql');

// Registrar las reservas de una nueva compra
async function registerReservations(
  orderId,
  items,
  transaction
) {
  if (!transaction) {
    throw new Error('Transaction required');
  }

  const rows = items.map(item => ({
    order_id: orderId,
    variant_id: item.variantId,
    quantity: item.quantity,
    status: 'reserved'
  }));

  return OrderReservation.bulkCreate(rows, {
    transaction,
    validate: true
  });
}

// Consultar las reservas activas de una variante
async function reservedForVariant(
  variantId,
  transaction
) {
  const total = await OrderReservation.sum(
    'quantity',
    {
      where: {
        variant_id: variantId,
        status: 'reserved'
      },
      transaction
    }
  );

  return Number(total ?? 0);
}

// Consultar todas las reservas de un pedido
async function findByOrder(orderId, transaction) {
  return OrderReservation.findAll({
    where: {
      order_id: orderId
    },
    order: [['variant_id', 'ASC']],
    transaction
  });
}

module.exports = {
  registerReservations,
  reservedForVariant,
  findByOrder
};