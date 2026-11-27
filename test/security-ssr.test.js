
const request = require('supertest');
const app = require('../app');

const { User } = require('../models/sql');

const {
  signToken,
  mockSession
} = require('./helpers/session');

const permissions = [
  'products:read:any',
  'orders:read:any',
  'users:read:any',
  'roles:read:any'
];

function sessionCookie(granted = permissions) {
  const headers = mockSession({
    userId: 1,
    roleId: 1,
    permissions: granted
  });

  return 'access_token=' +
    headers.Authorization.replace(/^Bearer\s+/i, '');
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Seguridad de las rutas SSR', () => {

  test.each([
    '/admin',
    '/admin/products',
    '/admin/variants',
    '/admin/inventory',
    '/admin/orders',
    '/admin/customers',
    '/admin/users',
    '/admin/roles',
    '/my/orders'
  ])('Protege la ruta sin sesion: %s', async route => {

    const response = await request(app)
      .get(route);

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toContain('/login');

  });

  test('Rechaza una cookie JWT invalida', async () => {

    const response = await request(app)
      .get('/admin')
      .set('Cookie', 'access_token=invalid-token');

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toContain('/login');

  });

  test('Rechaza una cuenta desactivada aunque tenga JWT', async () => {

    jest.spyOn(User, 'findByPk')
      .mockResolvedValue({
        id: 1,
        role_id: 1,
        active: false
      });

    const token = signToken(1);

    const response = await request(app)
      .get('/admin')
      .set('Cookie', `access_token=${token}`);

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toContain('/login');

  });

  test('Rechaza una sesion de un usuario eliminado', async () => {

    jest.spyOn(User, 'findByPk')
      .mockResolvedValue(null);

    const token = signToken(1);

    await request(app)
      .get('/admin')
      .set('Cookie', `access_token=${token}`)
      .expect(302);

  });

  test('La API no acepta solamente la cookie web', async () => {

    await request(app)
      .get('/api/auth/me')
      .set('Cookie', sessionCookie())
      .expect(401);

  });

  test.each([
    '/admin/users/1/status',
    '/admin/roles/1',
    '/admin/products/1/delete',
    '/admin/products/1/status',
    '/admin/orders/507f1f77bcf86cd799439021/status'
  ])('Impide escrituras sin permisos: %s', async route => {

    await request(app)
      .post(route)
      .set('Cookie', sessionCookie(permissions))
      .type('form')
      .send({})
      .expect(403);

  });

  test('Cerrar sesion elimina la cookie', async () => {

    const response = await request(app)
      .post('/logout')
      .set('Cookie', sessionCookie())
      .type('form');

    expect(response.status).toBe(302);

    const cookies = response.headers['set-cookie'] || [];

    const accessCookie = cookies.find(cookie =>
      cookie.startsWith('access_token=')
    );

    expect(accessCookie).toBeDefined();

    expect(accessCookie)
      .toMatch(/^access_token=;/);

  });

});
