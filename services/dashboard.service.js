
const {
  Product,
  ProductVariant,
  Inventory
} = require('../models/sql');

const orderService = require('./order.service');

// Obtener el ultimo estado registrado
function getCurrentStatus(order) {
  const history = order.statusHistory || [];

  return history.length > 0
    ? history[history.length - 1].status
    : 'unknown';
}

// Preparar un pedido para la vista
function formatOrder(order) {
  return {
    id: String(order._id),
    total: String(order.totals.total),
    status: getCurrentStatus(order),
    createdAt: order.createdAt
  };
}

// Consultar PostgreSQL y MongoDB
async function getDashboard() {

  const [
    products,
    variants,
    stock,
    orders,
    recentOrders
  ] = await Promise.all([

    // PostgreSQL
    Product.count(),
    ProductVariant.count(),
    Inventory.sum('stock'),

    // MongoDB
    orderService.countOrders(),
    orderService.recentOrders(5)

  ]);

  return {
    stats: {
      products,
      variants,
      stock: Number(stock ?? 0),
      orders
    },

    recentOrders: recentOrders.map(formatOrder)
  };
}

module.exports = {
  getDashboard
};