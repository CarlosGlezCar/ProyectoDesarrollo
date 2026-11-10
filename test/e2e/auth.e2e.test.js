const jwt = require('jsonwebtoken');
const config = require('config');
const { api, login, bearer, CREDENTIALS, isRemote } = require('./helpers');
const es = require('../../locales/es.json');

describe('Autenticación E2E (/api/auth)', () => {
  let adminToken;

  beforeAll(async () => {
    adminToken = await login('ADMIN');
  });

  describe('POST /api/auth/login', () => {
    test('login de ADMIN responde 200 con token "Bearer"', async () => {
      const response = await api()
        .post('/api/auth/login')
        .set('Accept-Language', 'es')
        .send(CREDENTIALS.ADMIN);

      expect(response.statusCode).toBe(200);
      expect(typeof response.body.data.token).toBe('string');
      expect(response.body.data.token.trim().length).toBeGreaterThan(0);
      expect(response.body.data.tokenType).toBe('Bearer');
    });

    test('la respuesta del login no contiene password, password_hash ni salt_key', async () => {
      const response = await api()
        .post('/api/auth/login')
        .set('Accept-Language', 'es')
        .send(CREDENTIALS.ADMIN);

      expect(response.statusCode).toBe(200);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('password_hash');
      expect(response.body).not.toHaveProperty('salt_key');
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).not.toHaveProperty('password_hash');
      expect(response.body.data).not.toHaveProperty('salt_key');
      expect(JSON.stringify(response.body)).not.toMatch(/password|salt/i);
    });

    test('login con contraseña incorrecta responde 401 con el mensaje de auth.invalidCredentials', async () => {
      const response = await api()
        .post('/api/auth/login')
        .set('Accept-Language', 'es')
        .send({
          email: CREDENTIALS.ADMIN.email,
          password: 'PasswordIncorrecto123!'
        });

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe(es.auth.invalidCredentials);
    });

    test('login con correo inexistente responde 401 con el mensaje de auth.invalidCredentials', async () => {
      const response = await api()
        .post('/api/auth/login')
        .set('Accept-Language', 'es')
        .send({
          email: 'no-existe@strideco.test',
          password: 'Password123!'
        });

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe(es.auth.invalidCredentials);
    });

    test('login sin body responde 400 con el mensaje de auth.credentialsRequired', async () => {
      const response = await api()
        .post('/api/auth/login')
        .set('Accept-Language', 'es');

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.auth.credentialsRequired);
    });
    test('login sin contraseña responde 400 con el mensaje de auth.credentialsRequired', async () => {
      const response = await api()
        .post('/api/auth/login')
        .set('Accept-Language', 'es')
        .send({ email: CREDENTIALS.ADMIN.email });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.auth.credentialsRequired);
    });
  });

  describe('GET /api/auth/me', () => {
    test('sin token responde 401 con el mensaje de auth.tokenRequired', async () => {
      const response = await api()
        .get('/api/auth/me')
        .set('Accept-Language', 'es');

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe(es.auth.tokenRequired);
    });

    test('con el token "abc.def.ghi" responde 401 con el mensaje de auth.invalidToken', async () => {
      const response = await api()
        .get('/api/auth/me')
        .set('Accept-Language', 'es')
        .set(bearer('abc.def.ghi'));

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe(es.auth.invalidToken);
    });

    test('con un token bien formado pero firmado con otro secreto responde 401 con el mensaje de auth.invalidToken', async () => {
      const tokenOtroSecreto = jwt.sign(
        { sub: '1' },
        'otro-secreto',
        { algorithm: 'HS256' }
      );

      const response = await api()
        .get('/api/auth/me')
        .set('Accept-Language', 'es')
        .set(bearer(tokenOtroSecreto));

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe(es.auth.invalidToken);
    });

    const testLocal = isRemote ? test.skip : test;

    testLocal('con un token expirado responde 401 con el mensaje de auth.tokenExpired', async () => {
      const expiredToken = jwt.sign(
        { sub: '1' },
        config.get('jwt.secret'),
        {
          algorithm: 'HS256',
          expiresIn: '-10s',
          issuer: config.get('jwt.issuer'),
          audience: config.get('jwt.audience')
        }
      );

      const response = await api()
        .get('/api/auth/me')
        .set('Accept-Language', 'es')
        .set(bearer(expiredToken));

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe(es.auth.tokenExpired);
    });

    test('con el token de ADMIN responde 200, devuelve el correo admin@strideco.test y no contiene password, password_hash ni salt_key', async () => {
      const response = await api()
        .get('/api/auth/me')
        .set('Accept-Language', 'es')
        .set(bearer(adminToken));

      expect(response.statusCode).toBe(200);
      expect(response.body.data.email).toBe('admin@strideco.test');
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('password_hash');
      expect(response.body).not.toHaveProperty('salt_key');
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).not.toHaveProperty('password_hash');
      expect(response.body.data).not.toHaveProperty('salt_key');
      expect(JSON.stringify(response.body)).not.toMatch(/password|salt/i);
    });
  });
});
