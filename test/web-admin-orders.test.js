
const request = require('supertest');
const app = require('../app');

const orderService = require('../services/order.service');
const { mockSession } = require('./helpers/session');

const orderId = '507f1f77bcf86cd799439021';

const permissions = [
  'orders:read:any',
  'orders:update:any'
];

const sampleOrder = {
  _id: orderId,

  customerId: {
    _id: '507f1f77bcf86cd799439011',
    userId: 3,
    email: 'cliente@example.com'
  },

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

  paymentMethod: 'cash',

  statusHistory: [{
    status: 'pending',
    changedById: 3,
    changedAt: '2026-11-25T20:00:00.000Z',
    note: 'Pedido de prueba'
  }],

  createdAt: '2026-11-25T20:00:00.000Z'
};

function sessionCookie(granted = permissions) {
  const headers = mockSession({
    userId: 1,
    permissions: granted
  });

  const token = headers.Authorization.replace(
    /^Bearer\s+/i,
    ''
  );

  return `access_token=${token}`;
}

beforeEach(() => {
  jest.spyOn(orderService, 'listAdminOrders')
    .mockResolvedValue([sampleOrder]);

  jest.spyOn(orderService, 'findAdminOrder')
    .mockResolvedValue(sampleOrder);

  jest.spyOn(orderService, 'changeOrderStatus')
    .mockResolvedValue(sampleOrder);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('F11 - Administracion de pedidos SSR', () => {

  test('Renderiza el listado de pedidos', async () => {
    const response = await request(app)
      .get('/admin/orders?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.headers['content-type'])
      .toContain('text/html');

    expect(response.text).toContain(orderId);

    expect(response.text)
      .toContain('cliente@example.com');
  });

  test('Filtra pedidos por estado', async () => {
    await request(app)
      .get('/admin/orders?status=pending')
      .set('Cookie', sessionCookie())
      .expect(200);

    expect(orderService.listAdminOrders)
      .toHaveBeenCalledWith('pending');
  });

  test('Rechaza un filtro invalido', async () => {
    await request(app)
      .get('/admin/orders?status=abc')
      .set('Cookie', sessionCookie())
      .expect(400);

    expect(orderService.listAdminOrders)
      .not.toHaveBeenCalled();
  });

  test('Muestra el detalle del pedido', async () => {
    const response = await request(app)
      .get('/admin/orders/' + orderId + '?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Calle de prueba');

    expect(response.text)
      .toContain('STRIDE-001-25');

    expect(response.text)
      .toContain('Historial de estados');
  });

  test('Redirige al login sin sesion', async () => {
    const response = await request(app)
      .get('/admin/orders');

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toContain('/login');
  });

  test('Rechaza usuarios sin permiso administrativo', async () => {
    await request(app)
      .get('/admin/orders')
      .set('Cookie', sessionCookie([
        'orders:read:own'
      ]))
      .expect(403);
  });

  test('Actualiza el estado mediante PRG', async () => {
    const response = await request(app)
      .post('/admin/orders/' + orderId + '/status')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        status: 'paid',
        note: 'Pago confirmado',
        changedById: '999'
      });

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toBe('/admin/orders/' + orderId);

    expect(orderService.changeOrderStatus)
      .toHaveBeenCalledWith(orderId, {
        status: 'paid',
        note: 'Pago confirmado',
        changedById: 1
      });
  });

  test('Rechaza estados inexistentes', async () => {
    await request(app)
      .post('/admin/orders/' + orderId + '/status')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        status: 'invalid',
        note: 'Prueba'
      })
      .expect(400);

    expect(orderService.changeOrderStatus)
      .not.toHaveBeenCalled();
  });

  test('Rechaza transiciones no permitidas', async () => {
    await request(app)
      .post('/admin/orders/' + orderId + '/status')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        status: 'delivered',
        note: 'Prueba'
      })
      .expect(400);

    expect(orderService.changeOrderStatus)
      .not.toHaveBeenCalled();
  });

  test('Rechaza notas demasiado largas', async () => {
    await request(app)
      .post('/admin/orders/' + orderId + '/status')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        status: 'paid',
        note: 'a'.repeat(251)
      })
      .expect(400);
  });

  test('Devuelve 404 si el pedido no existe', async () => {
    orderService.findAdminOrder
      .mockResolvedValue(null);

    await request(app)
      .get('/admin/orders/' + orderId)
      .set('Cookie', sessionCookie())
      .expect(404);
  });

  test('Devuelve 404 si el ID es invalido', async () => {
    await request(app)
      .get('/admin/orders/abc')
      .set('Cookie', sessionCookie())
      .expect(404);
  });

  test('Impide actualizar sin permiso de escritura', async () => {
    await request(app)
      .post('/admin/orders/' + orderId + '/status')
      .set('Cookie', sessionCookie([
        'orders:read:any'
      ]))
      .type('form')
      .send({
        status: 'paid'
      })
      .expect(403);

    expect(orderService.changeOrderStatus)
      .not.toHaveBeenCalled();
  });

  test('Oculta el formulario si solo tiene lectura', async () => {
    const response = await request(app)
      .get('/admin/orders/' + orderId)
      .set('Cookie', sessionCookie([
        'orders:read:any'
      ]));

    expect(response.status).toBe(200);

    expect(response.text)
      .not.toContain(
        'action="/admin/orders/' + orderId + '/status"'
      );
  });

  test('Renderiza el listado en ingles', async () => {
    const response = await request(app)
      .get('/admin/orders?lang=en')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Order management');

    expect(response.text)
      .toContain('Pending');
  });

  test('Muestra el listado vacio', async () => {
    orderService.listAdminOrders
      .mockResolvedValue([]);

    const response = await request(app)
      .get('/admin/orders?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('No se encontraron pedidos.');
  });

  test('No muestra informacion sensible', async () => {
    const response = await request(app)
      .get('/admin/orders/' + orderId)
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .not.toContain('password_hash');

    expect(response.text)
      .not.toContain('salt_key');
  });

  test('Devuelve 409 si otro administrador cambio el estado', async () => {
    orderService.changeOrderStatus.mockRejectedValue(
      new orderService.OrderServiceError(
        409,
        'ssr.adminOrders.concurrentUpdate'
      )
    );

    await request(app)
      .post('/admin/orders/' + orderId + '/status')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        status: 'paid',
        note: 'Prueba'
      })
      .expect(409);
  });

});
