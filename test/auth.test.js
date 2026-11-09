const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('config');

jest.mock('../utils/passwords', () => ({
  verifyPassword: jest.fn()
}));

const app = require('../app');
const { User } = require('../models/sql');
const { verifyPassword } = require('../utils/passwords');
const es = require('../locales/es.json');
const en = require('../locales/en.json');

const FORBIDDEN_KEYS = ['password', 'password_hash', 'salt_key'];

function fakeUser(overrides = {}) {
  const data = {
    id: 1,
    first_name: 'Ana',
    last_name: 'Prueba',
    email: 'ana@example.com',
    active: true,
    role_id: 1,
    password_hash: 'hash-secreto',
    salt_key: 'sal-secreta',
    ...overrides
  };
  return { ...data, toJSON: () => ({ ...data }) };
}

function signToken(sub = '1', options = {}) {
  return jwt.sign({ sub }, config.get('jwt.secret'), {
    expiresIn: config.get('jwt.expiresIn'),
    issuer: config.get('jwt.issuer'),
    audience: config.get('jwt.audience'),
    algorithm: 'HS256',
    ...options
  });
}

function expectNoSensitiveData(body) {
  const text = JSON.stringify(body);
  FORBIDDEN_KEYS.forEach((key) => {
    expect(text).not.toContain(`"${key}"`);
  });
  expect(text).not.toContain('hash-secreto');
  expect(text).not.toContain('sal-secreta');
}

afterEach(() => {
  jest.restoreAllMocks();
  verifyPassword.mockReset();
});

describe('GET / y GET /health', () => {
  test('GET /health responde 200 con status UP sin autenticación', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  test('GET / responde 200 sin autenticación', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
  });
});

describe('POST /api/auth/login', () => {
  test('credenciales correctas: 200 con JWT válido', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue(fakeUser());
    verifyPassword.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .set('Accept-Language', 'es')
      .send({ email: 'ana@example.com', password: 'Secreta123' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(es.auth.loginSuccessful);
    expect(res.body.data.tokenType).toBe('Bearer');

    const payload = jwt.verify(res.body.data.token, config.get('jwt.secret'), {
      issuer: config.get('jwt.issuer'),
      audience: config.get('jwt.audience'),
      algorithms: ['HS256']
    });
    expect(payload.sub).toBe('1');
    expectNoSensitiveData(res.body);
  });

  test('busca al usuario con el email recortado', async () => {
    const spy = jest.spyOn(User, 'findOne').mockResolvedValue(fakeUser());
    verifyPassword.mockResolvedValue(true);

    await request(app)
      .post('/api/auth/login')
      .send({ email: '  ana@example.com  ', password: 'Secreta123' });

    expect(spy).toHaveBeenCalledWith({ where: { email: 'ana@example.com' } });
  });

  test('contraseña incorrecta: 401', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue(fakeUser());
    verifyPassword.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .set('Accept-Language', 'es')
      .send({ email: 'ana@example.com', password: 'incorrecta' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe(es.auth.invalidCredentials);
    expect(res.body.data).toBeNull();
    expectNoSensitiveData(res.body);
  });

  test('usuario inexistente: 401 con el mismo mensaje', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .set('Accept-Language', 'es')
      .send({ email: 'nadie@example.com', password: 'Secreta123' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe(es.auth.invalidCredentials);
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  test('usuario inactivo: 401', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue(fakeUser({ active: false }));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@example.com', password: 'Secreta123' });

    expect(res.status).toBe(401);
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  test('contraseña de más de 72 bytes: 401 sin consultar la base', async () => {
    const spy = jest.spyOn(User, 'findOne');

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@example.com', password: 'a'.repeat(73) });

    expect(res.status).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });

  test.each([
    ['sin body', undefined],
    ['sin email', { password: 'Secreta123' }],
    ['sin password', { email: 'ana@example.com' }],
    ['email vacío', { email: '   ', password: 'Secreta123' }],
    ['password vacío', { email: 'ana@example.com', password: '' }],
    ['tipos inválidos', { email: 123, password: ['x'] }]
  ])('body inválido (%s): 400', async (_name, body) => {
    const spy = jest.spyOn(User, 'findOne');

    const req = request(app).post('/api/auth/login').set('Accept-Language', 'es');
    const res = body === undefined ? await req : await req.send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(es.auth.credentialsRequired);
    expect(spy).not.toHaveBeenCalled();
  });

  test('error inesperado de la base: 500', async () => {
    jest.spyOn(User, 'findOne').mockRejectedValue(new Error('db caída'));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@example.com', password: 'Secreta123' });

    expect(res.status).toBe(500);
  });

  test('el mensaje cambia a inglés con ?lang=en', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login?lang=en')
      .send({ email: 'nadie@example.com', password: 'Secreta123' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe(en.auth.invalidCredentials);
  });
});

describe('GET /api/auth/me', () => {
  test('token válido: 200 con el perfil y sin datos sensibles', async () => {
    jest.spyOn(User, 'findByPk').mockResolvedValue(fakeUser());

    const res = await request(app)
      .get('/api/auth/me')
      .set('Accept-Language', 'es')
      .set('Authorization', `Bearer ${signToken('1')}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(es.auth.profileRetrieved);
    expect(res.body.data.email).toBe('ana@example.com');
    expectNoSensitiveData(res.body);
  });

  test('sin token: 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('token con formato inválido: 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer no.es.un.jwt');
    expect(res.status).toBe(401);
  });

  test('token firmado con otro secreto: 401', async () => {
    const token = jwt.sign({ sub: '1' }, 'otro-secreto', {
      issuer: config.get('jwt.issuer'),
      audience: config.get('jwt.audience'),
      algorithm: 'HS256'
    });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  test('token expirado: 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signToken('1', { expiresIn: -10 })}`);
    expect(res.status).toBe(401);
  });

  test('token con issuer o audience incorrectos: 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set(
        'Authorization',
        `Bearer ${signToken('1', { issuer: 'otro', audience: 'otro' })}`
      );
    expect(res.status).toBe(401);
  });

  test('token válido de usuario inexistente: 401', async () => {
    jest.spyOn(User, 'findByPk').mockResolvedValue(null);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Accept-Language', 'es')
      .set('Authorization', `Bearer ${signToken('99')}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe(es.common.unauthorized);
  });

  test('token válido de usuario inactivo: 401', async () => {
    jest.spyOn(User, 'findByPk').mockResolvedValue(fakeUser({ active: false }));

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signToken('1')}`);

    expect(res.status).toBe(401);
  });
});