
const request = require('supertest');
const app = require('../app');

const customerService = require(
  '../services/customer.service'
);

const { mockSession } = require('./helpers/session');

const customerId = '507f1f77bcf86cd799439011';
const orderId = '507f1f77bcf86cd799439021';

const permissions = [
  'customers:read:any',
  'orders:read:any'
];

const sampleCustomer = {
  _id: customerId,
  userId: 3,
  email: 'cliente@example.com',
  phone: '6140000000',

  addresses: [{
    type: 'shipping',
    street: 'Calle de prueba',
    number: '100',
    city: 'Chihuahua',
    state: 'Chihuahua',
    postalCode: '31000',
    country: 'Mexico'
  }],

  createdAt: '2026-11-25T20:00:00.000Z'
};

const sampleOrder = {
  _id: orderId,

  totals: {
    total: '2000.00'
  },

  statusHistory: [{
    status: 'pending',
    changedById: 3
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
  jest.spyOn(customerService, 'listAdminCustomers')
    .mockResolvedValue([sampleCustomer]);

  jest.spyOn(customerService, 'findCustomerDetail')
    .mockResolvedValue({
      customer: sampleCustomer,
      orders: [sampleOrder]
    });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('F12 - Administracion de clientes SSR', () => {

  test('Renderiza el listado de clientes', async () => {
    const response = await request(app)
      .get('/admin/customers?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.headers['content-type'])
      .toContain('text/html');

    expect(response.text)
      .toContain('cliente@example.com');

    expect(response.text)
      .toContain(customerId);
  });

  test('Renderiza el detalle del cliente', async () => {
    const response = await request(app)
      .get('/admin/customers/' + customerId + '?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Detalle del cliente');

    expect(response.text)
      .toContain('cliente@example.com');

    expect(response.text)
      .toContain('Calle de prueba');

    expect(response.text)
      .toContain(orderId);

    expect(customerService.findCustomerDetail)
      .toHaveBeenCalledWith(customerId);
  });

  test.each([
    '/admin/customers',
    '/admin/customers/' + customerId
  ])('Redirige sin sesion: %s', async route => {
    const response = await request(app)
      .get(route);

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toContain('/login');
  });

  test('Rechaza usuarios sin permiso', async () => {
    await request(app)
      .get('/admin/customers')
      .set('Cookie', sessionCookie([
        'customers:read:own'
      ]))
      .expect(403);

    expect(customerService.listAdminCustomers)
      .not.toHaveBeenCalled();
  });

  test('Rechaza el acceso al detalle sin permiso', async () => {
    await request(app)
      .get('/admin/customers/' + customerId)
      .set('Cookie', sessionCookie([]))
      .expect(403);

    expect(customerService.findCustomerDetail)
      .not.toHaveBeenCalled();
  });

  test('Devuelve 404 para clientes inexistentes', async () => {
    customerService.findCustomerDetail
      .mockResolvedValue(null);

    await request(app)
      .get('/admin/customers/' + customerId)
      .set('Cookie', sessionCookie())
      .expect(404);
  });

  test('Devuelve 404 para identificadores invalidos', async () => {
    await request(app)
      .get('/admin/customers/abc')
      .set('Cookie', sessionCookie())
      .expect(404);

    expect(customerService.findCustomerDetail)
      .not.toHaveBeenCalled();
  });

  test('Muestra un listado vacio', async () => {
    customerService.listAdminCustomers
      .mockResolvedValue([]);

    const response = await request(app)
      .get('/admin/customers?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('No hay clientes registrados.');
  });

  test('Muestra cliente sin direcciones', async () => {
    customerService.findCustomerDetail
      .mockResolvedValue({
        customer: {
          ...sampleCustomer,
          addresses: []
        },
        orders: [sampleOrder]
      });

    const response = await request(app)
      .get('/admin/customers/' + customerId + '?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('El cliente no tiene direcciones registradas.');
  });

  test('Muestra cliente sin pedidos', async () => {
    customerService.findCustomerDetail
      .mockResolvedValue({
        customer: sampleCustomer,
        orders: []
      });

    const response = await request(app)
      .get('/admin/customers/' + customerId + '?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('El cliente todavía no tiene pedidos.');
  });

  test('Oculta enlaces a pedidos sin permiso', async () => {
    const response = await request(app)
      .get('/admin/customers/' + customerId)
      .set('Cookie', sessionCookie([
        'customers:read:any'
      ]));

    expect(response.status).toBe(200);

    expect(response.text)
      .not.toContain(
        'href="/admin/orders/' + orderId + '"'
      );
  });

  test('Renderiza el listado en ingles', async () => {
    const response = await request(app)
      .get('/admin/customers?lang=en')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Customer management');
  });

  test('Renderiza el detalle en ingles', async () => {
    const response = await request(app)
      .get('/admin/customers/' + customerId + '?lang=en')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Customer details');

    expect(response.text)
      .toContain('Customer orders');
  });

  test('No muestra informacion sensible', async () => {
    const response = await request(app)
      .get('/admin/customers/' + customerId)
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
