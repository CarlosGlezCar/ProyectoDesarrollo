
const request = require('supertest');
const app = require('../app');

const orderService = require('../services/order.service');
const { Order, Customer } = require('../models/mongo');
const { mockSession } = require('./helpers/session');

const orderId = '507f1f77bcf86cd799439021';
const customerId = '507f1f77bcf86cd799439011';

const sampleOrder = {
  _id: orderId,
  customerId,
  channel: 'web',
  paymentMethod: 'cash',

  items: [{
    productId: 1,
    variantId: 1,
    name: 'Tenis deportivos Stride',
    sku: 'STRIDE-001-25',
    quantity: 2,
    unitPrice: '1000.00'
  }],

  totals: {
    subtotal: '2000.00',
    shipping: '0.00',
    discount: '0.00',
    total: '2000.00'
  },

  shippingAddress: {
    street: 'Calle de prueba',
    number: '100',
    city: 'Chihuahua',
    state: 'Chihuahua',
    postalCode: '31000',
    country: 'Mexico'
  },

  statusHistory: [{
    status: 'pending',
    changedAt: '2026-11-25T20:00:00.000Z',
    note: 'Pedido de prueba'
  }],

  createdAt: '2026-11-25T20:00:00.000Z'
};

function sessionCookie(
  permissions = ['orders:read:own']
) {
  const headers = mockSession({
    userId: 1,
    permissions
  });

  const token = headers.Authorization.replace(
    /^Bearer\s+/i,
    ''
  );

  return `access_token=${token}`;
}

beforeEach(() => {
  jest.spyOn(orderService, 'listOwnOrders')
    .mockResolvedValue([sampleOrder]);

  jest.spyOn(orderService, 'findOwnOrder')
    .mockResolvedValue({
      order: sampleOrder
    });

  // Consultas utilizadas por el middleware RBAC
  jest.spyOn(Customer, 'find')
    .mockReturnValue({
      select: jest.fn().mockResolvedValue([
        { _id: customerId }
      ])
    });

  jest.spyOn(Customer, 'findById')
    .mockResolvedValue({
      userId: 1
    });

  jest.spyOn(Order, 'findById')
    .mockResolvedValue(sampleOrder);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('F6 - Mis pedidos SSR', () => {

  test('Muestra el listado de pedidos propios', async () => {
    const response = await request(app)
      .get('/my/orders?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.headers['content-type'])
      .toContain('text/html');

    expect(response.text)
      .toContain('Mis pedidos');

    expect(response.text)
      .toContain(orderId);

    expect(response.text)
      .toContain('Tenis deportivos Stride');

    expect(orderService.listOwnOrders)
      .toHaveBeenCalledWith(1);
  });

  test('Muestra el detalle de un pedido propio', async () => {
    const response = await request(app)
      .get('/my/orders/' + orderId + '?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Detalle del pedido');

    expect(response.text)
      .toContain('STRIDE-001-25');

    expect(response.text)
      .toContain('Calle de prueba');

    expect(response.text)
      .toContain('Historial de estados');

    expect(response.text)
      .toContain('Pendiente');

    expect(orderService.findOwnOrder)
      .toHaveBeenCalledWith(orderId, 1);
  });

  test.each([
    '/my/orders',
    '/my/orders/' + orderId
  ])('Redirige al login sin sesion: %s', async route => {
    const response = await request(app)
      .get(route);

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toContain('/login');
  });

  test('Rechaza usuarios sin permiso de lectura', async () => {
    await request(app)
      .get('/my/orders')
      .set('Cookie', sessionCookie([]))
      .expect(403);

    expect(orderService.listOwnOrders)
      .not.toHaveBeenCalled();
  });

  test('Impide consultar pedidos ajenos', async () => {
    Customer.findById.mockResolvedValue({
      userId: 999
    });

    await request(app)
      .get('/my/orders/' + orderId)
      .set('Cookie', sessionCookie())
      .expect(403);

    expect(orderService.findOwnOrder)
      .not.toHaveBeenCalled();
  });

  test('Devuelve 404 si no existe el pedido', async () => {
    Order.findById.mockResolvedValue(null);

    await request(app)
      .get('/my/orders/' + orderId)
      .set('Cookie', sessionCookie())
      .expect(404);
  });

  test('Devuelve 404 con un ID invalido', async () => {
    await request(app)
      .get('/my/orders/abc')
      .set('Cookie', sessionCookie())
      .expect(404);
  });

  test('Muestra el estado sin pedidos', async () => {
    orderService.listOwnOrders
      .mockResolvedValue([]);

    const response = await request(app)
      .get('/my/orders?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Todavía no tienes pedidos.');
  });

  test('Muestra el listado en ingles', async () => {
    const response = await request(app)
      .get('/my/orders?lang=en')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('My orders');

    expect(response.text)
      .toContain('View details');
  });

  test('Muestra el detalle en ingles', async () => {
    const response = await request(app)
      .get('/my/orders/' + orderId + '?lang=en')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Order details');

    expect(response.text)
      .toContain('Status history');
  });

  test('No muestra informacion sensible', async () => {
    const response = await request(app)
      .get('/my/orders/' + orderId)
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .not.toContain('password_hash');

    expect(response.text)
      .not.toContain('salt_key');

    expect(response.headers['cache-control'])
      .toContain('no-store');
  });

});