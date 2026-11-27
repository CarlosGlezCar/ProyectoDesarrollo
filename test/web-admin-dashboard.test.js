
const request = require('supertest');
const app = require('../app');

const dashboardService = require(
  '../services/dashboard.service'
);

const { mockSession } = require('./helpers/session');

const sampleDashboard = {
  stats: {
    products: 7,
    variants: 3,
    stock: 80,
    orders: 2
  },

  recentOrders: [
    {
      id: '507f1f77bcf86cd799439021',
      total: '1100.00',
      status: 'pending',
      createdAt: '2026-11-25T20:00:00.000Z'
    },
    {
      id: '507f1f77bcf86cd799439022',
      total: '1500.00',
      status: 'paid',
      createdAt: '2026-11-24T20:00:00.000Z'
    }
  ]
};

const permissions = [
  'products:read:any',
  'orders:read:any',
  'variants:read:any',
  'inventory:read:any'
];

function sessionCookie(grantedPermissions = permissions) {
  const headers = mockSession({
    permissions: grantedPermissions
  });

  const token = headers.Authorization.replace(
    /^Bearer\s+/i,
    ''
  );

  return `access_token=${token}`;
}

beforeEach(() => {
  jest.spyOn(dashboardService, 'getDashboard')
    .mockResolvedValue(sampleDashboard);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('F7 - Dashboard administrativo SSR', () => {

  test('Renderiza indicadores y pedidos en HTML', async () => {

    const response = await request(app)
      .get('/admin?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.headers['content-type'])
      .toContain('text/html');

    expect(response.text)
      .toContain('Unidades en stock');

    expect(response.text)
      .toContain('Pedidos recientes');

    expect(response.text)
      .toContain('507f1f77bcf86cd799439021');

    expect(response.text)
      .toContain('Pendiente');

    expect(response.text)
      .toContain('Pagado');

    expect(response.text)
      .toContain('<strong>80</strong>');

    expect(dashboardService.getDashboard)
      .toHaveBeenCalledTimes(1);

  });

  test('Redirige al login si no hay sesion', async () => {

    const response = await request(app)
      .get('/admin');

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toContain('/login');

    expect(dashboardService.getDashboard)
      .not.toHaveBeenCalled();

  });

test.each([
  [[]],
  [['products:read:any']],
  [['orders:read:any']],
  [['products:read:any', 'orders:read:own']]
])('Devuelve 403 con permisos insuficientes: %j', async (granted) => {
  await request(app)
    .get('/admin')
    .set('Cookie', sessionCookie(granted))
    .expect(403);

  expect(dashboardService.getDashboard)
    .not.toHaveBeenCalled();
});

  test('Renderiza el dashboard en ingles', async () => {

    const response = await request(app)
      .get('/admin?lang=en')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Recent orders');

    expect(response.text)
      .toContain('Units in stock');

    expect(response.text)
      .toContain('Pending');

    expect(response.text)
      .toContain('Paid');

  });

  test('Muestra el estado sin pedidos', async () => {

    dashboardService.getDashboard.mockResolvedValue({
      stats: {
        products: 0,
        variants: 0,
        stock: 0,
        orders: 0
      },
      recentOrders: []
    });

    const response = await request(app)
      .get('/admin?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Todavía no hay pedidos registrados.');

  });

  test('No muestra informacion sensible', async () => {

    const response = await request(app)
      .get('/admin')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .not.toContain('password_hash');

    expect(response.text)
      .not.toContain('salt_key');

  });

  test('Muestra error 500 si falla el servicio', async () => {

    dashboardService.getDashboard.mockRejectedValue(
      new Error('Database error')
    );

    const response = await request(app)
      .get('/admin')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(500);

    expect(response.headers['content-type'])
      .toContain('text/html');

    expect(response.text)
      .not.toContain('Database error');

  });

});