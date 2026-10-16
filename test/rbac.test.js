const express = require('express');
const request = require('supertest');

jest.mock('../models/relationals', () => ({
  Role: {
    findByPk: jest.fn()
  },
  Permission: {}
}));

jest.mock('../models/documents', () => ({
  Order: {
    findById: jest.fn()
  },
  Customer: {
    findById: jest.fn()
  }
}));

const { Role } = require('../models/relationals');
const { Order, Customer } = require('../models/documents');
const authorize = require('../middlewares/authorize');

// Simula un usuario autenticado para probar la autorización.
function testAuthenticate(req, res, next) {
  const userId = req.headers['x-user-id'];
  const roleId = req.headers['x-role-id'];

  if (!userId || !roleId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  req.user = {
    id: Number(userId),
    role_id: Number(roleId)
  };

  next();
}

const app = express();
app.use(express.json());

app.delete(
  '/products/:id',
  testAuthenticate,
  authorize('products', 'delete', 'any'),
  (req, res) => res.status(204).end()
);

app.get(
  '/orders/:id',
  testAuthenticate,
  authorize('orders', 'read', 'ownOrAny'),
  (req, res) => res.status(200).json({ message: 'Order authorized' })
);

describe('RBAC authorization', () => {
  let rolePermissions;

  beforeEach(() => {
    jest.clearAllMocks();

    rolePermissions = new Map();

    Role.findByPk.mockImplementation(async (roleId) => ({
      id: Number(roleId),
      permissions: rolePermissions.get(Number(roleId)) || []
    }));

    Order.findById.mockImplementation(async (orderId) => ({
      _id: orderId,
      customerId: 'customer-1'
    }));

    Customer.findById.mockResolvedValue({
      userId: 101
    });
  });

  test('ADMIN can delete products', async () => {
    rolePermissions.set(1, [
      { key: 'products:delete:any' }
    ]);

    const response = await request(app)
      .delete('/products/10')
      .set('x-user-id', '101')
      .set('x-role-id', '1');

    expect(response.status).toBe(204);
  });

  test('SALES cannot delete products', async () => {
    rolePermissions.set(2, [
      { key: 'products:read:any' }
    ]);

    const response = await request(app)
      .delete('/products/10')
      .set('x-user-id', '102')
      .set('x-role-id', '2');

    expect(response.status).toBe(403);
  });

  test('USER can read their own order', async () => {
    rolePermissions.set(3, [
      { key: 'orders:read:own' }
    ]);

    Customer.findById.mockResolvedValue({
      userId: 101
    });

    const response = await request(app)
      .get('/orders/order-1')
      .set('x-user-id', '101')
      .set('x-role-id', '3');

    expect(response.status).toBe(200);
  });

  test('USER cannot read another users order', async () => {
    rolePermissions.set(3, [
      { key: 'orders:read:own' }
    ]);

    Customer.findById.mockResolvedValue({
      userId: 202
    });

    const response = await request(app)
      .get('/orders/order-2')
      .set('x-user-id', '101')
      .set('x-role-id', '3');

    expect(response.status).toBe(403);
  });

  test('USER without orders:read:any cannot read another users order', async () => {
    rolePermissions.set(3, [
    { key: 'orders:read:own' }
    ]);

    Customer.findById.mockResolvedValue({
      userId: 202
    });

    const response = await request(app)
      .get('/orders/order-3')
      .set('x-user-id', '101')
      .set('x-role-id', '3');

    expect(response.status).toBe(403);
  });
});