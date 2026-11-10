const { api, login, bearer } = require('./helpers');
const es = require('../../locales/es.json');

describe('Administración de Clientes E2E (/api/customers)', () => {
  let adminToken;
  let salesToken;
  let userToken;
  let seedUserId;
  let salesUserId;
  let userRoleId;

  const createdUserIds = [];
  const createdCustomerIds = [];
  const TEST_PASSWORD = 'E2eCustomerUser123!';

  function generateUserEmail(suffix = '') {
    return `e2e.customers.${Date.now()}.${suffix || Math.random().toString(36).substring(2, 7)}@strideco.test`;
  }

  async function createTestUser(suffix = '') {
    const email = generateUserEmail(suffix);
    const response = await api()
      .post('/api/users')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: 'Usuario',
        lastName: 'ClienteE2E',
        email,
        roleId: userRoleId,
        password: TEST_PASSWORD,
        active: true
      });

    const user = response.body.data;
    if (user?.id) {
      createdUserIds.push(user.id);
    }
    return user;
  }

  async function createTestCustomer(user, customData = {}) {
    const defaultData = {
      userId: user.id,
      email: user.email,
      phone: '6141234567',
      addresses: [{
        type: 'shipping',
        street: 'Calle E2E',
        number: '123',
        city: 'Chihuahua',
        state: 'Chihuahua',
        postalCode: '31000',
        country: 'México'
      }]
    };

    const response = await api()
      .post('/api/customers')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({ ...defaultData, ...customData });

    const customer = response.body.data;
    if (customer?._id) {
      createdCustomerIds.push(customer._id);
    }
    return { response, customer };
  }

  beforeAll(async () => {
    adminToken = await login('ADMIN');
    salesToken = await login('SALES');
    userToken = await login('USER');

    const meUserRes = await api()
      .get('/api/auth/me')
      .set('Accept-Language', 'es')
      .set(bearer(userToken));
    seedUserId = meUserRes.body.data.id;

    const meSalesRes = await api()
      .get('/api/auth/me')
      .set('Accept-Language', 'es')
      .set(bearer(salesToken));
    salesUserId = meSalesRes.body.data.id;

    const rolesRes = await api()
      .get('/api/roles')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));
    const userRole = rolesRes.body.data.find(r => r.name === 'USER');
    userRoleId = userRole.id;
  });

  afterAll(async () => {
    // 1. Borrar primero los clientes creados
    for (const customerId of createdCustomerIds) {
      try {
        const checkRes = await api()
          .get(`/api/customers/${customerId}`)
          .set('Accept-Language', 'es')
          .set(bearer(adminToken));

        if (checkRes.statusCode === 200) {
          await api()
            .delete(`/api/customers/${customerId}`)
            .set('Accept-Language', 'es')
            .set(bearer(adminToken));
        }
      } catch (_) {
        // ignore
      }
    }

    // 2. Borrar después los usuarios creados
    for (const userId of createdUserIds) {
      try {
        const checkRes = await api()
          .get(`/api/users/${userId}`)
          .set('Accept-Language', 'es')
          .set(bearer(adminToken));

        if (checkRes.statusCode === 200) {
          await api()
            .delete(`/api/users/${userId}`)
            .set('Accept-Language', 'es')
            .set(bearer(adminToken));
        }
      } catch (_) {
        // ignore
      }
    }
  });

  test('1. Ciclo completo sobre un cliente propio', async () => {
    const testUser = await createTestUser('ciclo');
    const email = testUser.email;
    const initialPhone = '6141112233';
    const shippingAddress = {
      type: 'shipping',
      street: 'Av. Siempre Viva',
      number: '742',
      city: 'Chihuahua',
      state: 'Chihuahua',
      postalCode: '31000',
      country: 'México'
    };

    // POST /api/customers con userId, email, phone y un arreglo addresses con una dirección de tipo shipping responde 201 con customers.created
    const postRes = await api()
      .post('/api/customers')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        userId: testUser.id,
        email,
        phone: initialPhone,
        addresses: [shippingAddress]
      });

    expect(postRes.statusCode).toBe(201);
    expect(postRes.body.message).toBe(es.customers.created);
    expect(postRes.body.data).toHaveProperty('_id');
    expect(postRes.body.data.userId).toBe(testUser.id);
    expect(postRes.body.data.email).toBe(email);
    expect(postRes.body.data.phone).toBe(initialPhone);
    expect(Array.isArray(postRes.body.data.addresses)).toBe(true);
    expect(postRes.body.data.addresses).toHaveLength(1);
    expect(postRes.body.data.addresses[0].type).toBe('shipping');

    const customerId = postRes.body.data._id;
    createdCustomerIds.push(customerId);

    // GET /api/customers/:id responde 200
    const getByIdRes = await api()
      .get(`/api/customers/${customerId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getByIdRes.statusCode).toBe(200);
    expect(getByIdRes.body.data._id).toBe(customerId);
    expect(getByIdRes.body.data.userId).toBe(testUser.id);
    expect(getByIdRes.body.data.email).toBe(email);
    expect(getByIdRes.body.data.phone).toBe(initialPhone);

    // GET /api/customers responde 200 y la lista contiene el _id
    const listRes = await api()
      .get('/api/customers')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.some(c => c._id === customerId)).toBe(true);

    // PUT cambia phone y responde 200 (verifica con un GET posterior)
    const updatedPhone = '6149998877';
    const putRes = await api()
      .put(`/api/customers/${customerId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        phone: updatedPhone
      });

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.message).toBe(es.customers.updated);
    expect(putRes.body.data.phone).toBe(updatedPhone);

    const getAfterPutRes = await api()
      .get(`/api/customers/${customerId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getAfterPutRes.statusCode).toBe(200);
    expect(getAfterPutRes.body.data.phone).toBe(updatedPhone);

    // DELETE responde 200
    const deleteRes = await api()
      .delete(`/api/customers/${customerId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.message).toBe(es.customers.deleted);

    // un GET posterior responde 404 con customers.notFound
    const getAfterDeleteRes = await api()
      .get(`/api/customers/${customerId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getAfterDeleteRes.statusCode).toBe(404);
    expect(getAfterDeleteRes.body.message).toBe(es.customers.notFound);
  });

  test('2. Normalización y relación', async () => {
    const testUser = await createTestUser('norm');
    const rawEmail = `   ${testUser.email.toUpperCase()}   `;
    const expectedNormalizedEmail = testUser.email.toLowerCase();

    const postRes = await api()
      .post('/api/customers')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        userId: testUser.id,
        email: rawEmail,
        phone: '6142223344',
        addresses: [{
          type: 'shipping',
          street: 'Calle Normalizada',
          number: '10',
          city: 'Chihuahua',
          state: 'Chihuahua',
          postalCode: '31000',
          country: 'México'
        }]
      });

    expect(postRes.statusCode).toBe(201);
    const customerId = postRes.body.data._id;
    createdCustomerIds.push(customerId);

    // un email enviado con mayúsculas y espacios se guarda en minúsculas y sin espacios
    expect(postRes.body.data.email).toBe(expectedNormalizedEmail);

    // data.userId del cliente es el id del usuario propio
    expect(postRes.body.data.userId).toBe(testUser.id);

    // Verificamos persistencia con GET posterior
    const getRes = await api()
      .get(`/api/customers/${customerId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.data.email).toBe(expectedNormalizedEmail);
    expect(getRes.body.data.userId).toBe(testUser.id);
  });

  test('3. Datos inválidos responden 400 o 404', async () => {
    // POST sin body responde 400
    const resNoBody = await api()
      .post('/api/customers')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(resNoBody.statusCode).toBe(400);

    // POST sin email responde 400
    const userForNoEmail = await createTestUser('noemail');
    const resNoEmail = await api()
      .post('/api/customers')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        userId: userForNoEmail.id,
        phone: '6141234567'
      });

    expect(resNoEmail.statusCode).toBe(400);

    // POST sin userId responde 400
    const resNoUserId = await api()
      .post('/api/customers')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        email: generateUserEmail('nouserid'),
        phone: '6141234567'
      });

    expect(resNoUserId.statusCode).toBe(400);

    // con un userId inexistente (99999999) responde 404 con users.notFound
    const resNonExistentUser = await api()
      .post('/api/customers')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        userId: 99999999,
        email: generateUserEmail('baduser'),
        phone: '6141234567'
      });

    expect(resNonExistentUser.statusCode).toBe(404);
    expect(resNonExistentUser.body.message).toBe(es.users.notFound);

    // con un userId que ya tiene cliente (el de USER) responde 400 con common.duplicate
    const resDuplicateUser = await api()
      .post('/api/customers')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        userId: seedUserId,
        email: generateUserEmail('dupuser'),
        phone: '6141234567'
      });

    expect(resDuplicateUser.statusCode).toBe(400);
    expect(resDuplicateUser.body.message).toBe(es.common.duplicate);

    // con un email ya registrado responde 400 con customers.emailExists
    const userDupEmail = await createTestUser('dupemail');
    const { customer: originalCust } = await createTestCustomer(userDupEmail);

    const anotherUser = await createTestUser('anotheruser');
    const resDuplicateEmail = await api()
      .post('/api/customers')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        userId: anotherUser.id,
        email: originalCust.email,
        phone: '6141234567'
      });

    expect(resDuplicateEmail.statusCode).toBe(400);
    expect(resDuplicateEmail.body.message).toBe(es.customers.emailExists);

    // GET /api/customers/abc responde 400 con common.invalidId
    const resInvalidId = await api()
      .get('/api/customers/abc')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(resInvalidId.statusCode).toBe(400);
    expect(resInvalidId.body.message).toBe(es.common.invalidId);

    // GET con un ObjectId válido inexistente ("000000000000000000000000") responde 404
    const resNonExistentId = await api()
      .get('/api/customers/000000000000000000000000')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(resNonExistentId.statusCode).toBe(404);
    expect(resNonExistentId.body.message).toBe(es.customers.notFound);
  });

  describe('4. Acceso según la matriz real del seed', () => {
    let userCustomer;
    let salesCustomer;
    let testUserForSales;
    let testCustForSales;

    beforeAll(async () => {
      const allCustomersRes = await api()
        .get('/api/customers')
        .set('Accept-Language', 'es')
        .set(bearer(adminToken));

      userCustomer = allCustomersRes.body.data.find(c => c.userId === seedUserId);
      salesCustomer = allCustomersRes.body.data.find(c => c.userId === salesUserId);

      // Creamos un cliente de prueba para las operaciones de SALES
      testUserForSales = await createTestUser('salesaccess');
      const created = await createTestCustomer(testUserForSales);
      testCustForSales = created.customer;
    });

    test('sin token responde 401', async () => {
      const response = await api()
        .get('/api/customers')
        .set('Accept-Language', 'es');

      expect(response.statusCode).toBe(401);
    });

    test('USER solo lee sus propios clientes (GET lista y GET por id) y recibe 403 en otros recursos o acciones', async () => {
      // USER GET /api/customers devuelve solo clientes cuyo userId es el de USER
      const userListRes = await api()
        .get('/api/customers')
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(userListRes.statusCode).toBe(200);
      expect(Array.isArray(userListRes.body.data)).toBe(true);
      expect(userListRes.body.data.length).toBeGreaterThan(0);
      expect(userListRes.body.data.every(c => c.userId === seedUserId)).toBe(true);

      // USER GET /api/customers/:id de su propio cliente responde 200
      const userGetOwnRes = await api()
        .get(`/api/customers/${userCustomer._id}`)
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(userGetOwnRes.statusCode).toBe(200);
      expect(userGetOwnRes.body.data._id).toBe(userCustomer._id);
      expect(userGetOwnRes.body.data.userId).toBe(seedUserId);

      // USER GET /api/customers/:id del cliente de SALES responde 403 con common.forbidden
      const userGetSalesRes = await api()
        .get(`/api/customers/${salesCustomer._id}`)
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(userGetSalesRes.statusCode).toBe(403);
      expect(userGetSalesRes.body.message).toBe(es.common.forbidden);

      // USER POST responde 403
      const userPostRes = await api()
        .post('/api/customers')
        .set('Accept-Language', 'es')
        .set(bearer(userToken))
        .send({
          userId: seedUserId,
          email: generateUserEmail('userpost'),
          phone: '6141234567'
        });

      expect(userPostRes.statusCode).toBe(403);
      expect(userPostRes.body.message).toBe(es.common.forbidden);

      // USER PUT responde 403
      const userPutRes = await api()
        .put(`/api/customers/${testCustForSales._id}`)
        .set('Accept-Language', 'es')
        .set(bearer(userToken))
        .send({
          phone: '6149998877'
        });

      expect(userPutRes.statusCode).toBe(403);
      expect(userPutRes.body.message).toBe(es.common.forbidden);

      // USER DELETE responde 403
      const userDeleteRes = await api()
        .delete(`/api/customers/${testCustForSales._id}`)
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(userDeleteRes.statusCode).toBe(403);
      expect(userDeleteRes.body.message).toBe(es.common.forbidden);
    });

    test('SALES tiene read y update (200), pero no create ni delete (403)', async () => {
      // SALES GET /api/customers responde 200 y ve clientes ajenos
      const salesListRes = await api()
        .get('/api/customers')
        .set('Accept-Language', 'es')
        .set(bearer(salesToken));

      expect(salesListRes.statusCode).toBe(200);
      expect(Array.isArray(salesListRes.body.data)).toBe(true);
      expect(salesListRes.body.data.some(c => c.userId !== salesUserId)).toBe(true);

      // SALES GET /api/customers/:id sobre cliente de otro usuario responde 200
      const salesGetRes = await api()
        .get(`/api/customers/${testCustForSales._id}`)
        .set('Accept-Language', 'es')
        .set(bearer(salesToken));

      expect(salesGetRes.statusCode).toBe(200);
      expect(salesGetRes.body.data._id).toBe(testCustForSales._id);

      // SALES PUT /api/customers/:id responde 200 (SALES tiene customers:update:any)
      const salesPutRes = await api()
        .put(`/api/customers/${testCustForSales._id}`)
        .set('Accept-Language', 'es')
        .set(bearer(salesToken))
        .send({
          phone: '6145554433'
        });

      expect(salesPutRes.statusCode).toBe(200);
      expect(salesPutRes.body.message).toBe(es.customers.updated);
      expect(salesPutRes.body.data.phone).toBe('6145554433');

      // SALES POST /api/customers responde 403 con common.forbidden (SALES no tiene customers:create:any)
      const salesPostRes = await api()
        .post('/api/customers')
        .set('Accept-Language', 'es')
        .set(bearer(salesToken))
        .send({
          userId: testUserForSales.id,
          email: generateUserEmail('salespost'),
          phone: '6141234567'
        });

      expect(salesPostRes.statusCode).toBe(403);
      expect(salesPostRes.body.message).toBe(es.common.forbidden);

      // SALES DELETE /api/customers/:id responde 403 con common.forbidden (SALES no tiene customers:delete:any)
      const salesDeleteRes = await api()
        .delete(`/api/customers/${testCustForSales._id}`)
        .set('Accept-Language', 'es')
        .set(bearer(salesToken));

      expect(salesDeleteRes.statusCode).toBe(403);
      expect(salesDeleteRes.body.message).toBe(es.common.forbidden);

      // Comprobar que el cliente testCustForSales sigue existiendo
      const checkRes = await api()
        .get(`/api/customers/${testCustForSales._id}`)
        .set('Accept-Language', 'es')
        .set(bearer(adminToken));

      expect(checkRes.statusCode).toBe(200);
      expect(checkRes.body.data._id).toBe(testCustForSales._id);
    });
  });
});
