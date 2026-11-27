const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('config');

const authService = require('../services/auth.service');
const app = require('../app');

const { User, Role } = require('../models/sql');

const fakeUser = {
  id: 1,
  first_name: 'Ana',
  last_name: 'Prueba',
  email: 'ana@example.com',
  active: true,
  role_id: 1,
  password_hash: 'hash-secreto',
  salt_key: 'sal-secreta'
};

jest.mock('../services/dashboard.service', () => ({
  getDashboard: async () => ({
    stats: {
      products: 0,
      variants: 0,
      stock: 0,
      orders: 0
    },
    recentOrders: []
  })
}));

function fakeToken() {
  return jwt.sign(
    { sub: '1' },
    config.get('jwt.secret'),
    {
      expiresIn: config.get('jwt.expiresIn'),
      issuer: config.get('jwt.issuer'),
      audience: config.get('jwt.audience'),
      algorithm: 'HS256'
    }
  );
}

function mockLoginSuccess() {
  jest.spyOn(authService, 'login').mockResolvedValue({
    success: true,
    status: 200,
    token: fakeToken(),
    user: fakeUser
  });

  jest.spyOn(User, 'findByPk')
    .mockResolvedValue(fakeUser);
}

function mockPermissions(keys) {
  jest.spyOn(Role, 'findByPk').mockResolvedValue({
    id: 1,
    permissions: keys.map(key => ({ key }))
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('F1 - Autenticacion web SSR', () => {

  test('GET /login responde HTML en español', async () => {
    const res = await request(app)
      .get('/login?lang=es');

    expect(res.status).toBe(200);
    expect(res.headers['content-type'])
      .toContain('text/html');

    expect(res.text).toContain('Iniciar sesión');
  });

  test('GET /login responde HTML en inglés', async () => {
    const res = await request(app)
      .get('/login?lang=en');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Sign in');
  });

  test('Sin sesión redirige al login', async () => {
    const res = await request(app)
      .get('/admin');

    expect(res.status).toBe(302);
    expect(res.headers.location)
      .toContain('/login?next=');
  });

  test('Formulario inválido devuelve 400', async () => {
    const res = await request(app)
      .post('/login')
      .type('form')
      .send({
        email: 'incorrecto',
        password: ''
      });

    expect(res.status).toBe(400);
    expect(res.text).toContain('incorrecto');
  });

  test('Credenciales incorrectas devuelven 401', async () => {
    jest.spyOn(authService, 'login')
      .mockResolvedValue({
        success: false,
        status: 401,
        messageKey: 'auth.invalidCredentials'
      });

    const res = await request(app)
      .post('/login')
      .type('form')
      .send({
        email: 'ana@example.com',
        password: 'incorrecta'
      });

    expect(res.status).toBe(401);
    expect(res.headers['content-type'])
      .toContain('text/html');
    expect(res.headers['set-cookie'])
      .toBeUndefined();
  });

  test('Login correcto guarda una cookie HttpOnly', async () => {
    mockLoginSuccess();

    const res = await request(app)
      .post('/login')
      .type('form')
      .send({
        email: 'ana@example.com',
        password: 'password',
        next: '/admin'
      });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin');

    const cookies = res.headers['set-cookie'].join(';');

    expect(cookies).toContain('access_token=');
    expect(cookies).toContain('HttpOnly');
  });

  test('Usuario sin permisos recibe HTML 403', async () => {
    mockLoginSuccess();

    mockPermissions([
      'products:read:any'
    ]);

    const agent = request.agent(app);

    await agent.post('/login')
      .type('form')
      .send({
        email: 'ana@example.com',
        password: 'password'
      });

    const res = await agent.get('/admin');

    expect(res.status).toBe(403);
    expect(res.headers['content-type'])
      .toContain('text/html');
  });

  test('Flujo login, página protegida y logout', async () => {
    mockLoginSuccess();

    mockPermissions([
      'products:read:any',
      'orders:read:any'
    ]);

    const agent = request.agent(app);

    await agent.post('/login')
      .type('form')
      .send({
        email: 'ana@example.com',
        password: 'password',
        next: '/admin'
      })
      .expect(302);

    const admin = await agent.get('/admin');

    expect(admin.status).toBe(200);
    expect(admin.text).toContain('>Ana</span>');
    expect(admin.text).toContain('Pedidos recientes');
    expect(admin.text).not.toContain('hash-secreto');
    expect(admin.text).not.toContain('sal-secreta');
    expect(admin.text).not.toContain('password_hash');
    expect(admin.text).not.toContain('salt_key');

    await agent.post('/logout').expect(302);

    const protectedPage = await agent.get('/admin');

    expect(protectedPage.status).toBe(302);
    expect(protectedPage.headers.location)
      .toContain('/login');
  });

  test('No permite redireccionar a sitios externos', async () => {
    mockLoginSuccess();

    const res = await request(app)
      .post('/login')
      .type('form')
      .send({
        email: 'ana@example.com',
        password: 'password',
        next: 'https://example.com'
      });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });

});