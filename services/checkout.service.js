const reservationService = require('./reservation.service');
const {sequelize,User,Product,ProductVariant,Inventory,CheckoutAttempt} = require('../models/sql');

const {Customer,Order} = require('../models/mongo');

const orderService = require('./order.service');

const {isMongoId,isPositiveInteger} = require('../utils/validation');

class CheckoutError extends Error {
  constructor(status, messageKey) {
    super(messageKey);
    this.name = 'CheckoutError';
    this.status = status;
    this.messageKey = messageKey;
  }
}

// Convertir centavos a un importe decimal exacto
function money(cents) {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

// Convertir un precio a centavos
function toCents(price) {
  const text = String(price);

  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    throw new Error('Invalid product price');
  }

  const [whole, fraction = ''] = text.split('.');

  return BigInt(whole) * 100n +
    BigInt(fraction.padEnd(2, '0'));
}

// Validar los datos del checkout
function validateInput(items, address, paymentMethod) {
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 20
  ) {
    throw new CheckoutError(
      400,
      'ssr.checkout.emptyCart'
    );
  }

  const ids = new Set();

  for (const item of items) {
    if (
      !item ||
      !isPositiveInteger(item.variantId) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99 ||
      ids.has(item.variantId)
    ) {
      throw new CheckoutError(
        400,
        'ssr.checkout.invalidCart'
      );
    }

    ids.add(item.variantId);
  }

  if (!['cash', 'card', 'transfer'].includes(paymentMethod)) {
    throw new CheckoutError(
      400,
      'ssr.checkout.invalidPayment'
    );
  }

  const cleanAddress = {};

  for (const field of [
    'street',
    'number',
    'city',
    'state',
    'postalCode',
    'country'
  ]) {
    const value = address?.[field];

    if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.trim().length > 150
    ) {
      throw new CheckoutError(
        400,
        'ssr.checkout.invalidAddress'
      );
    }

    cleanAddress[field] = value.trim();
  }

  return cleanAddress;
}

// Buscar o crear al cliente usando el usuario autenticado
async function findOrCreateCustomer(user, address) {
  let customer = await Customer.findOne({
    userId: user.id
  });

  if (!customer) {
    customer = await Customer.create({
      userId: user.id,
      email: user.email,
      addresses: [{
        type: 'shipping',
        ...address
      }]
    });
  }

  return customer;
}

// Consultar y bloquear inventario dentro de una transaccion
async function prepareItems(items, transaction) {
  const orderItems = [];
  const reservations = [];

  let subtotal = 0n;

  const sortedItems = [...items].sort(
    (a, b) => a.variantId - b.variantId
  );

  for (const item of sortedItems) {
    const variant = await ProductVariant.findByPk(
      item.variantId,
      {
        transaction,
        lock: transaction.LOCK.UPDATE
      }
    );

    if (!variant || !variant.active) {
      throw new CheckoutError(
        400,
        'ssr.checkout.unavailable'
      );
    }

    const product = await Product.findByPk(
      variant.product_id,
      {
        transaction,
        lock: transaction.LOCK.UPDATE
      }
    );

    if (!product || !product.active) {
      throw new CheckoutError(
        400,
        'ssr.checkout.unavailable'
      );
    }

    const inventory = await Inventory.findOne({
      where: {
        variant_id: variant.id
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (
      !inventory ||
      item.quantity >
        Number(inventory.stock) - Number(inventory.reserved)
    ) {
      throw new CheckoutError(
        400,
        'ssr.checkout.insufficientStock'
      );
    }

    const price = toCents(product.price);

    subtotal += price * BigInt(item.quantity);

    orderItems.push({
      productId: product.id,
      variantId: variant.id,
      sku: variant.sku,
      name: product.name,
      quantity: item.quantity,
      unitPrice: money(price)
    });

    reservations.push({
      inventory,
      quantity: item.quantity
    });
  }

  return {
    orderItems,
    reservations,
    subtotal
  };
}

// Reservar existencias y registrar el intento
async function prepareCheckout({
  orderId,
  userId,
  items,
  address,
  paymentMethod
}) {
  if (
    !isMongoId(orderId) ||
    !isPositiveInteger(userId)
  ) {
    throw new CheckoutError(
      400,
      'ssr.checkout.invalidCart'
    );
  }

  return sequelize.transaction(async transaction => {

    // Serializar compras del mismo usuario
    const user = await User.findByPk(userId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!user || !user.active) {
      throw new CheckoutError(
        403,
        'common.forbidden'
      );
    }

    // Comprobar si ya se habia procesado este intento
    const existing = await CheckoutAttempt.findByPk(
      orderId,
      { transaction }
    );

    if (existing) {
      if (Number(existing.user_id) !== userId) {
        throw new CheckoutError(
          403,
          'common.forbidden'
        );
      }

      return existing;
    }

    const pending = await CheckoutAttempt.findOne({
        where: {
            user_id: userId,
            status: 'pending'
        },
        transaction
        });

    if (pending) {
        throw new CheckoutError(
            409,
            'ssr.checkout.pendingPurchase'
        );
    }

    const cleanAddress = validateInput(
      items,
      address,
      paymentMethod
    );

    const prepared = await prepareItems(
      items,
      transaction
    );

    const customer = await findOrCreateCustomer(
      user,
      cleanAddress
    );

    // Construir el pedido con datos del servidor
    const orderData = {
      _id: orderId,
      channel: 'web',
      customerId: String(customer._id),
      paymentMethod,

      items: prepared.orderItems,

      totals: {
        subtotal: money(prepared.subtotal),
        shipping: '0.00',
        discount: '0.00',
        total: money(prepared.subtotal)
      },

      shippingAddress: cleanAddress,

      statusHistory: [{
        status: 'pending',
        changedById: user.id,
        changedAt: new Date().toISOString(),
        note: 'Web checkout'
      }]
    };

    // Validar el documento antes de reservar inventario
    await new Order(orderData).validate();

    for (const reservation of prepared.reservations) {
      await reservation.inventory.update({
        reserved:
          Number(reservation.inventory.reserved) +
          reservation.quantity
      }, {
        transaction
      });
    }

    const attempt = await CheckoutAttempt.create({
      order_id: orderId,
      user_id: userId,
      status: 'pending',
      payload: orderData
    }, {
      transaction
    });

    // Registrar las reservas individuales del pedido
    await reservationService.registerReservations(
      orderId,
      prepared.orderItems,
      transaction
    );

    return attempt;
  });
}

// Guardar el pedido en MongoDB
async function completeCheckout(attempt) {
  let order = await Order.findById(attempt.order_id);

  // Una compra completada no vuelve a reservar existencias
  if (attempt.status === 'completed') {
    if (!order) {
      throw new CheckoutError(
        409,
        'ssr.checkout.orderMissing'
      );
    }

    return order;
  }

  if (!attempt.payload) {
    throw new Error('Missing checkout payload');
  }

  if (!order) {
    try {
      order = await orderService.createOrder(
        attempt.payload
      );
    } catch (err) {
      // Otro intento pudo registrar el mismo pedido
      if (err.code === 11000) {
        order = await Order.findById(attempt.order_id);
      } else {
        throw err;
      }

      if (!order) {
        throw err;
      }
    }
  }

  if (
    order.channel !== 'web' ||
    String(order.customerId) !== attempt.payload.customerId
  ) {
    throw new Error('Checkout order mismatch');
  }

  // Marcar como completado y eliminar la copia temporal
  await attempt.update({
    status: 'completed',
    payload: null
  });

  return order;
}

// Ejecutar todo el checkout
async function placeOrder(data) {
  const attempt = await prepareCheckout(data);

  return completeCheckout(attempt);
}

// Buscar una compra pendiente del usuario
async function getPendingAttempt(userId) {
  return CheckoutAttempt.findOne({
    where: {
      user_id: userId,
      status: 'pending'
    },
    order: [['created_at', 'ASC']]
  });
}

// Consultar un intento especifico del usuario
async function getOwnAttempt(orderId, userId) {
  const attempt = await CheckoutAttempt.findByPk(orderId);

  if (attempt && Number(attempt.user_id) !== userId) {
    throw new CheckoutError(403, 'common.forbidden');
  }

  return attempt;
}

module.exports = {
  CheckoutError,
  placeOrder,
  getOwnAttempt,
  getPendingAttempt
};