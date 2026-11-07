const { api, login, bearer } = require('./helpers');
const es = require('../../locales/es.json');

describe('Administración de Usuarios E2E (/api/users)', () => {
  let adminToken;
  let salesToken;
  let userToken;
  let userRoleId;
  const TEST_PASSWORD = 'E2eUser123!';
  const createdUserIds = [];

  function generateEmail(suffix = '') {
    return `e2e.users.${Date.now()}.${suffix || Math.random().toString(36).substring(2, 7)}@strideco.test`;
  }

  async function createTestUser(suffix = '') {
    const email = generateEmail(suffix);
    const response = await api()
      .post('/api/users')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: 'Usuario',
        lastName: 'E2E',
        email,
        roleId: userRoleId,
        password: TEST_PASSWORD,
        active: true
      });

    const user = response.body.data;
    if (user?.id) {
      createdUserIds.push(user.id);
    }
    return { ...user, rawPassword: TEST_PASSWORD };
  }

  beforeAll(async () => {
    adminToken = await login('ADMIN');
    salesToken = await login('SALES');
    userToken = await login('USER');

    const rolesRes = await api()
      .get('/api/roles')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    const userRole = rolesRes.body.data.find(r => r.name === 'USER');
    userRoleId = userRole.id;
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      try {
        const checkRes = await api()
          .get(`/api/users/${id}`)
          .set('Accept-Language', 'es')
          .set(bearer(adminToken));

        if (checkRes.statusCode === 200) {
          await api()
            .delete(`/api/users/${id}`)
            .set('Accept-Language', 'es')
            .set(bearer(adminToken));
        }
      } catch (_) {
        // ignore
      }
    }
  });

  test('1. Ciclo completo sobre un usuario propio', async () => {
    const email = generateEmail('ciclo');
    const uniqueName = 'Carlos';
    const uniqueLastName = 'Santana';

    // POST /api/users responde 201 con el mensaje users.created
    const postRes = await api()
      .post('/api/users')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: uniqueName,
        lastName: uniqueLastName,
        email,
        roleId: userRoleId,
        password: TEST_PASSWORD,
        active: true
      });

    expect(postRes.statusCode).toBe(201);
    expect(postRes.body.message).toBe(es.users.created);
    expect(postRes.body.data).toHaveProperty('id');

    const userId = postRes.body.data.id;
    createdUserIds.push(userId);

    // GET /api/users/:id responde 200 con el mismo correo
    const getByIdRes = await api()
      .get(`/api/users/${userId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getByIdRes.statusCode).toBe(200);
    expect(getByIdRes.body.data.id).toBe(userId);
    expect(getByIdRes.body.data.email).toBe(email);

    // GET /api/users responde 200 y la lista contiene el id
    const listRes = await api()
      .get('/api/users')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.some(u => u.id === userId)).toBe(true);

    // PUT cambia name y lastName y responde 200 (verifica con un GET posterior)
    const updatedName = 'Carlos Alberto';
    const updatedLastName = 'Santana Gómez';

    const putRes = await api()
      .put(`/api/users/${userId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: updatedName,
        lastName: updatedLastName
      });

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.data.first_name).toBe(updatedName);
    expect(putRes.body.data.last_name).toBe(updatedLastName);

    const getAfterPutRes = await api()
      .get(`/api/users/${userId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getAfterPutRes.statusCode).toBe(200);
    expect(getAfterPutRes.body.data.first_name).toBe(updatedName);
    expect(getAfterPutRes.body.data.last_name).toBe(updatedLastName);

    // DELETE responde 200
    const deleteRes = await api()
      .delete(`/api/users/${userId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(deleteRes.statusCode).toBe(200);

    // un GET posterior responde 404 con users.notFound
    const getAfterDeleteRes = await api()
      .get(`/api/users/${userId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getAfterDeleteRes.statusCode).toBe(404);
    expect(getAfterDeleteRes.body.message).toBe(es.users.notFound);
  });

  test('2. Datos sensibles: respuestas de POST, GET por id, GET lista y PUT no contienen password ni salt_key', async () => {
    const email = generateEmail('sensible');

    const postRes = await api()
      .post('/api/users')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: 'Seguridad',
        lastName: 'Prueba',
        email,
        roleId: userRoleId,
        password: TEST_PASSWORD,
        active: true
      });

    expect(postRes.statusCode).toBe(201);
    const userId = postRes.body.data.id;
    createdUserIds.push(userId);

    const getByIdRes = await api()
      .get(`/api/users/${userId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    const listRes = await api()
      .get('/api/users')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    const putRes = await api()
      .put(`/api/users/${userId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: 'Seguridad Modificada'
      });

    for (const res of [postRes, getByIdRes, listRes, putRes]) {
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('password_hash');
      expect(res.body).not.toHaveProperty('salt_key');
      expect(JSON.stringify(res.body)).not.toMatch(/password|salt/i);
    }
  });

  test('3. Relaciones: GET /api/users/:id devuelve data.role con el nombre USER', async () => {
    const user = await createTestUser('relaciones');

    const response = await api()
      .get(`/api/users/${user.id}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveProperty('role');
    expect(response.body.data.role).toBeDefined();
    expect(response.body.data.role.name).toBe('USER');
  });

  test('4. Integración: login exitoso con usuario nuevo y 401 tras desactivarlo con active: false', async () => {
    const email = generateEmail('integracion');

    const createRes = await api()
      .post('/api/users')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: 'Activo',
        lastName: 'Prueba',
        email,
        roleId: userRoleId,
        password: TEST_PASSWORD,
        active: true
      });

    expect(createRes.statusCode).toBe(201);
    const userId = createRes.body.data.id;
    createdUserIds.push(userId);

    // POST /api/auth/login responde 200 con data.token
    const loginRes = await api()
      .post('/api/auth/login')
      .set('Accept-Language', 'es')
      .send({
        email,
        password: TEST_PASSWORD
      });

    expect(loginRes.statusCode).toBe(200);
    expect(typeof loginRes.body.data.token).toBe('string');
    expect(loginRes.body.data.token.length).toBeGreaterThan(0);

    // PUT cambia active a false
    const deactivateRes = await api()
      .put(`/api/users/${userId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        active: false
      });

    expect(deactivateRes.statusCode).toBe(200);
    expect(deactivateRes.body.data.active).toBe(false);

    // Login responde 401
    const loginInactiveRes = await api()
      .post('/api/auth/login')
      .set('Accept-Language', 'es')
      .send({
        email,
        password: TEST_PASSWORD
      });

    expect(loginInactiveRes.statusCode).toBe(401);
  });

  test('5. Datos inválidos responden 400', async () => {
    // POST sin body responde 400
    const resNoBody = await api()
      .post('/api/users')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(resNoBody.statusCode).toBe(400);

    // POST sin password responde 400 con users.passwordRequired
    const resNoPass = await api()
      .post('/api/users')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: 'Sin',
        lastName: 'Password',
        email: generateEmail('nopass'),
        roleId: userRoleId,
        password: ''
      });

    expect(resNoPass.statusCode).toBe(400);
    expect(resNoPass.body.message).toBe(es.users.passwordRequired);

    const resMissingPassField = await api()
      .post('/api/users')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: 'Sin',
        lastName: 'CampoPassword',
        email: generateEmail('missingpass'),
        roleId: userRoleId
      });

    expect(resMissingPassField.statusCode).toBe(400);

    // POST con correo inválido responde 400 con users.invalidEmail
    const resInvalidEmail = await api()
      .post('/api/users')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: 'Invalido',
        lastName: 'Email',
        email: 'correo-no-valido',
        roleId: userRoleId,
        password: TEST_PASSWORD
      });

    expect(resInvalidEmail.statusCode).toBe(400);
    expect(resInvalidEmail.body.message).toBe(es.users.invalidEmail);

    // POST con roleId inexistente (99999999) responde 400 con users.invalidRole
    const resInvalidRole = await api()
      .post('/api/users')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: 'Invalido',
        lastName: 'Rol',
        email: generateEmail('badrole'),
        roleId: 99999999,
        password: TEST_PASSWORD
      });

    expect(resInvalidRole.statusCode).toBe(400);
    expect(resInvalidRole.body.message).toBe(es.users.invalidRole);

    // POST con un correo ya registrado responde 400
    const existingUser = await createTestUser('dupemail');

    const resDuplicateEmail = await api()
      .post('/api/users')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: 'Duplicado',
        lastName: 'Correo',
        email: existingUser.email,
        roleId: userRoleId,
        password: TEST_PASSWORD
      });

    expect(resDuplicateEmail.statusCode).toBe(400);

    // GET /api/users/abc responde 400 con common.invalidId
    const resInvalidId = await api()
      .get('/api/users/abc')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(resInvalidId.statusCode).toBe(400);
    expect(resInvalidId.body.message).toBe(es.common.invalidId);
  });

  describe('6. Acceso según la matriz real', () => {
    test('GET /api/users sin token responde 401', async () => {
      const response = await api()
        .get('/api/users')
        .set('Accept-Language', 'es');

      expect(response.statusCode).toBe(401);
    });

    test('SALES y USER GET /api/users y POST /api/users responden 403 con common.forbidden', async () => {
      // SALES GET /api/users responde 403
      const salesGetRes = await api()
        .get('/api/users')
        .set('Accept-Language', 'es')
        .set(bearer(salesToken));

      expect(salesGetRes.statusCode).toBe(403);
      expect(salesGetRes.body.message).toBe(es.common.forbidden);

      // SALES POST /api/users responde 403
      const salesPostRes = await api()
        .post('/api/users')
        .set('Accept-Language', 'es')
        .set(bearer(salesToken))
        .send({
          name: 'Forbidden',
          lastName: 'Sales',
          email: generateEmail('sales-forbidden'),
          roleId: userRoleId,
          password: TEST_PASSWORD
        });

      expect(salesPostRes.statusCode).toBe(403);
      expect(salesPostRes.body.message).toBe(es.common.forbidden);

      // USER GET /api/users responde 403
      const userGetRes = await api()
        .get('/api/users')
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(userGetRes.statusCode).toBe(403);
      expect(userGetRes.body.message).toBe(es.common.forbidden);

      // USER POST /api/users responde 403
      const userPostRes = await api()
        .post('/api/users')
        .set('Accept-Language', 'es')
        .set(bearer(userToken))
        .send({
          name: 'Forbidden',
          lastName: 'User',
          email: generateEmail('user-forbidden'),
          roleId: userRoleId,
          password: TEST_PASSWORD
        });

      expect(userPostRes.statusCode).toBe(403);
      expect(userPostRes.body.message).toBe(es.common.forbidden);
    });
  });
});
