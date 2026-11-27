
const mongoose = require('mongoose');
const connectMongo = require('../config/mongoose');

const {
  sequelize,
  Inventory,
  CheckoutAttempt
} = require('../models/sql');

const { Order } = require('../models/mongo');

async function audit() {
  try {
    await sequelize.authenticate();
    await connectMongo();

    console.log('\n=== AUDITORIA DE INVENTARIO ===');

    const inventories = await Inventory.findAll({
      attributes: [
        'id',
        'variant_id',
        'stock',
        'reserved'
      ],
      raw: true
    });

    const attempts = await CheckoutAttempt.findAll({
      attributes: ['order_id', 'status', 'payload'],
      raw: true
    });

    const orders = await Order.find({
      channel: 'web'
    })
      .select('_id channel items statusHistory')
      .lean();

    const attemptMap = new Map(
      attempts.map(a => [a.order_id, a])
    );

    const orderMap = new Map(
      orders.map(o => [String(o._id), o])
    );

    const requiredReservations = new Map();

    let warnings = 0;

    function warn(message) {
      warnings++;
      console.warn('AVISO:', message);
    }

    function addReservations(items) {
      for (const item of items || []) {
        if (
          !Number.isInteger(item.variantId) ||
          item.variantId <= 0 ||
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0
        ) {
          warn('Articulo con variante o cantidad invalida');
          continue;
        }

        const current =
          requiredReservations.get(item.variantId) || 0;

        requiredReservations.set(
          item.variantId,
          current + item.quantity
        );
      }
    }

    console.log('\n=== PEDIDOS WEB ===');

    for (const order of orders) {
      const id = String(order._id);
      const history = order.statusHistory || [];

      const status = history.length
        ? history[history.length - 1].status
        : 'unknown';

      const attempt = attemptMap.get(id);

      console.log({
        pedido: id,
        estado: status,
        intento: attempt?.status || 'sin registro',
        articulos: order.items.map(item => ({
          variante: item.variantId,
          cantidad: item.quantity
        }))
      });

      if (!attempt) {
        warn(`Pedido ${id} sin checkout_attempt`);
      }

      if (['pending', 'paid'].includes(status)) {
        addReservations(order.items);
      }

      if (
        ['shipped', 'delivered', 'cancelled']
          .includes(status)
      ) {
        warn(`Pedido ${id}: revisar movimiento historico`);
      }

      if (status === 'unknown') {
        warn(`Pedido ${id} sin estado conocido`);
      }
    }

    console.log('\n=== INTENTOS DE CHECKOUT ===');

    for (const attempt of attempts) {
      const order = orderMap.get(attempt.order_id);

      console.log({
        pedido: attempt.order_id,
        estado: attempt.status,
        existeEnMongo: Boolean(order)
      });

      if (attempt.status === 'pending') {
        warn(`Checkout pendiente: ${attempt.order_id}`);

        if (!order) {
          if (Array.isArray(attempt.payload?.items)) {
            addReservations(attempt.payload.items);
          } else {
            warn('Intento pendiente sin articulos recuperables');
          }
        }
      }

      if (attempt.status === 'completed' && !order) {
        warn(`Pedido completado ausente: ${attempt.order_id}`);
      }
    }

    console.log('\n=== EXISTENCIAS Y RESERVAS ===');

    const rows = inventories.map(item => {
      const stock = Number(item.stock);
      const reserved = Number(item.reserved);

      const required =
        requiredReservations.get(item.variant_id) || 0;

      if (
        stock < 0 ||
        reserved < 0 ||
        reserved > stock
      ) {
        warn(`Inventario invalido: variante ${item.variant_id}`);
      }

      if (reserved < required) {
        warn(`Reservas insuficientes: variante ${item.variant_id}`);
      }

      return {
        variante: item.variant_id,
        stock,
        reserved,
        disponible: stock - reserved,
        reservasWebEsperadas: required,
        diferencia: reserved - required
      };
    });

    console.table(rows);

    for (const variantId of requiredReservations.keys()) {
      if (!inventories.some(i => i.variant_id === variantId)) {
        warn(`Variante ${variantId} sin inventario`);
      }
    }

    console.log('\n=== RESUMEN ===');

    console.log({
      inventarios: inventories.length,
      pedidosWeb: orders.length,
      intentosCheckout: attempts.length,
      avisos: warnings
    });

  } catch (err) {
    console.error('Error de auditoria:', err.message);
    process.exitCode = 1;

  } finally {
    await Promise.allSettled([
      mongoose.disconnect(),
      sequelize.close()
    ]);
  }
}

audit();