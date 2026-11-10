const { api, login, bearer, CREDENTIALS } = require('./helpers');
const es = require('../../locales/es.json');

describe('Administración de Órdenes E2E (/api/orders)', () => {
  let adminToken;
  let salesToken;
  let userToken;
  let adminUserId;
  let salesUserId;
  let userCustomerId;
  let salesCustomerId;
  let seedProductId;
  let userSeedOrderId;
  let salesSeedOrderId;

  const createdOrderIds = [];

  function buildOrderPayload(overrides = {}) {
    return {
      customerId: userCustomerId,
      salesPersonId: salesUserId,
      paymentMethod: 'card',
      totals: {
        subtotal: '2000.00',
        shipping: '100.00',
        discount: '0.00',
        total: '2100.00'
      },
      shippingAddress: {
        street: 'Avenida Siempre Viva',
        number: '742',
        city: 'Chihuahua',
        state: 'Chihuahua',
        postalCode: '31000',
        country: 'México'
      },
      items: [{
        productId: seedProductId,
        quantity: 2,
        unitPrice: '1000.00'
      }],
      ...overrides
    };
  }

  beforeAll(async () => {
    adminToken = await login('ADMIN');
    salesToken = await login('SALES');
    userToken = await login('USER');

    // ID del usuario ADMIN
    const adminMeRes = await api()
      .get('/api/auth/me')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));
    adminUserId = adminMeRes.body.data.id;

    // ID del usuario vendedor SALES
    const salesMeRes = await api()
      .get('/api/auth/me')
      .set('Accept-Language', 'es')
      .set(bearer(salesToken));
    salesUserId = salesMeRes.body.data.id;

    // Clientes: cliente de USER y de SALES
    const custRes = await api()
      .get('/api/customers')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    const userCust = custRes.body.data.find(c => c.email === CREDENTIALS.USER.email);
    const salesCust = custRes.body.data.find(c => c.email === CREDENTIALS.SALES.email);
    userCustomerId = userCust._id;
    salesCustomerId = salesCust._id;

    // Producto del seed "Tenis deportivos Stride"
    const prodRes = await api()
      .get('/api/products')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    const seedProd = prodRes.body.data.find(p => p.name === 'Tenis deportivos Stride');
    seedProductId = seedProd.id;

    // Órdenes del seed para pruebas de acceso
    const ordersRes = await api()
      .get('/api/orders')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    const userOrder = ordersRes.body.data.find(
      o => o.customerId && (o.customerId._id === userCustomerId || o.customerId.email === CREDENTIALS.USER.email)
    );
    const salesOrder = ordersRes.body.data.find(
      o => o.customerId && (o.customerId._id === salesCustomerId || o.customerId.email === CREDENTIALS.SALES.email)
    );

    userSeedOrderId = userOrder._id;
    salesSeedOrderId = salesOrder._id;
  });

  afterAll(async () => {
    for (const orderId of createdOrderIds) {
      try {
        const checkRes = await api()
          .get(`/api/orders/${orderId}`)
          .set('Accept-Language', 'es')
          .set(bearer(adminToken));

        if (checkRes.statusCode === 200) {
          await api()
            .delete(`/api/orders/${orderId}`)
            .set('Accept-Language', 'es')
            .set(bearer(adminToken));
        }
      } catch (_) {
        // ignore
      }
    }
  });

  test('1. Ciclo completo sobre una orden propia', async () => {
    const payload = buildOrderPayload();

    // POST /api/orders responde 201 con orders.created
    const postRes = await api()
      .post('/api/orders')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send(payload);

    expect(postRes.statusCode).toBe(201);
    expect(postRes.body.message).toBe(es.orders.created);
    expect(postRes.body.data).toHaveProperty('_id');
    expect(postRes.body.data.paymentMethod).toBe('card');

    const orderId = postRes.body.data._id;
    createdOrderIds.push(orderId);

    // GET /api/orders/:id responde 200
    const getByIdRes = await api()
      .get(`/api/orders/${orderId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getByIdRes.statusCode).toBe(200);
    expect(getByIdRes.body.data._id).toBe(orderId);
    expect(getByIdRes.body.data.paymentMethod).toBe('card');

    // GET /api/orders responde 200 y la lista contiene el _id
    const listRes = await api()
      .get('/api/orders')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.some(o => o._id === orderId)).toBe(true);

    // PUT cambia paymentMethod y responde 200
    const putRes = await api()
      .put(`/api/orders/${orderId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        paymentMethod: 'transfer'
      });

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.message).toBe(es.orders.updated);
    expect(putRes.body.data.paymentMethod).toBe('transfer');

    // Verificación posterior con GET
    const getAfterPutRes = await api()
      .get(`/api/orders/${orderId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getAfterPutRes.statusCode).toBe(200);
    expect(getAfterPutRes.body.data.paymentMethod).toBe('transfer');

    // DELETE responde 200
    const deleteRes = await api()
      .delete(`/api/orders/${orderId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.message).toBe(es.orders.deleted);

    // un GET posterior responde 404 con orders.notFound
    const getAfterDeleteRes = await api()
      .get(`/api/orders/${orderId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getAfterDeleteRes.statusCode).toBe(404);
    expect(getAfterDeleteRes.body.message).toBe(es.orders.notFound);
  });

  test('2. Relaciones e historial', async () => {
    // ADMIN crea una orden propia
    const postRes = await api()
      .post('/api/orders')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send(buildOrderPayload());

    expect(postRes.statusCode).toBe(201);
    const order = postRes.body.data;
    createdOrderIds.push(order._id);

    // La orden devuelve data.customerId con los datos del cliente (ej. email)
    expect(typeof order.customerId).toBe('object');
    expect(order.customerId).toHaveProperty('email');
    expect(order.customerId.email).toBe(CREDENTIALS.USER.email);

    // statusHistory con un primer estado "pending" cuyo changedById es el id de ADMIN
    expect(Array.isArray(order.statusHistory)).toBe(true);
    expect(order.statusHistory.length).toBeGreaterThanOrEqual(1);
    expect(order.statusHistory[0].status).toBe('pending');
    expect(order.statusHistory[0].changedById).toBe(adminUserId);

    // PUT con un estado válido y una note agrega una entrada nueva al historial
    const putRes = await api()
      .put(`/api/orders/${order._id}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        status: 'paid',
        note: 'Pago verificado por ADMIN'
      });

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.data.statusHistory).toHaveLength(2);

    const latestStatus = putRes.body.data.statusHistory[1];
    expect(latestStatus.status).toBe('paid');
    expect(latestStatus.note).toBe('Pago verificado por ADMIN');
    expect(latestStatus.changedById).toBe(adminUserId);

    // Verificamos con un GET posterior
    const getRes = await api()
      .get(`/api/orders/${order._id}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.data.statusHistory).toHaveLength(2);
    expect(getRes.body.data.statusHistory[1].status).toBe('paid');
    expect(getRes.body.data.statusHistory[1].note).toBe('Pago verificado por ADMIN');
    expect(getRes.body.data.statusHistory[1].changedById).toBe(adminUserId);
  });

  test('3. Datos inválidos responden 400 o 404', async () => {
    // Creamos una orden base para pruebas de PUT
    const baseOrderRes = await api()
      .post('/api/orders')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send(buildOrderPayload());

    expect(baseOrderRes.statusCode).toBe(201);
    const testOrderId = baseOrderRes.body.data._id;
    createdOrderIds.push(testOrderId);

    // POST sin body responde 400
    const resNoBody = await api()
      .post('/api/orders')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(resNoBody.statusCode).toBe(400);

    // POST con items [] responde 400 con orders.emptyItems
    const resEmptyItems = await api()
      .post('/api/orders')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send(buildOrderPayload({
        items: [],
        totals: {
          subtotal: '0.00',
          shipping: '0.00',
          discount: '0.00',
          total: '0.00'
        }
      }));

    expect(resEmptyItems.statusCode).toBe(400);
    expect(resEmptyItems.body.message).toBe(es.orders.emptyItems);

    // POST con customerId "abc" responde 400 con common.invalidId
    const resInvalidCustomerId = await api()
      .post('/api/orders')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send(buildOrderPayload({ customerId: 'abc' }));

    expect(resInvalidCustomerId.statusCode).toBe(400);
    expect(resInvalidCustomerId.body.message).toBe(es.common.invalidId);

    // POST con un customerId ObjectId válido inexistente responde 404 con orders.customerNotFound
    const resNonExistentCustomer = await api()
      .post('/api/orders')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send(buildOrderPayload({ customerId: '000000000000000000000000' }));

    expect(resNonExistentCustomer.statusCode).toBe(404);
    expect(resNonExistentCustomer.body.message).toBe(es.orders.customerNotFound);

    // POST con un salesPersonId inexistente (99999999) responde 404 con users.notFound
    const resNonExistentSales = await api()
      .post('/api/orders')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send(buildOrderPayload({ salesPersonId: 99999999 }));

    expect(resNonExistentSales.statusCode).toBe(404);
    expect(resNonExistentSales.body.message).toBe(es.users.notFound);

    // POST con un productId inexistente (99999999) responde 404 con products.notFound
    const resNonExistentProduct = await api()
      .post('/api/orders')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send(buildOrderPayload({
        items: [{
          productId: 99999999,
          quantity: 2,
          unitPrice: '1000.00'
        }]
      }));

    expect(resNonExistentProduct.statusCode).toBe(404);
    expect(resNonExistentProduct.body.message).toBe(es.products.notFound);

    // POST con un campo no permitido responde 400
    const resDisallowedField = await api()
      .post('/api/orders')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send(buildOrderPayload({ campoNoPermitido: 'invalido' }));

    expect(resDisallowedField.statusCode).toBe(400);

    // PUT con un status inválido responde 400 con orders.invalidStatus
    const resInvalidStatus = await api()
      .put(`/api/orders/${testOrderId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        status: 'estado_invalido'
      });

    expect(resInvalidStatus.statusCode).toBe(400);
    expect(resInvalidStatus.body.message).toBe(es.orders.invalidStatus);

    // PUT con una note sin status responde 400
    const resNoteNoStatus = await api()
      .put(`/api/orders/${testOrderId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        note: 'Nota sin estado asociado'
      });

    expect(resNoteNoStatus.statusCode).toBe(400);

    // GET /api/orders/abc responde 400 con common.invalidId
    const resInvalidId = await api()
      .get('/api/orders/abc')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(resInvalidId.statusCode).toBe(400);
    expect(resInvalidId.body.message).toBe(es.common.invalidId);
  });

  describe('4. Acceso según la matriz real del seed', () => {
    test('sin token responde 401', async () => {
      const response = await api()
        .get('/api/orders')
        .set('Accept-Language', 'es');

      expect(response.statusCode).toBe(401);
    });

    test('USER GET /api/orders/own devuelve solo órdenes de su cliente', async () => {
      const response = await api()
        .get('/api/orders/own')
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      for (const order of response.body.data) {
        expect(order.customerId.email).toBe(CREDENTIALS.USER.email);
      }
    });

    test('USER GET /api/orders responde 403 con common.forbidden', async () => {
      const response = await api()
        .get('/api/orders')
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
    });

    test('USER GET de la orden de su cliente responde 200 y de la del cliente de SALES responde 403', async () => {
      // Orden de su cliente responde 200
      const ownOrderRes = await api()
        .get(`/api/orders/${userSeedOrderId}`)
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(ownOrderRes.statusCode).toBe(200);
      expect(ownOrderRes.body.data._id).toBe(userSeedOrderId);
      expect(ownOrderRes.body.data.customerId.email).toBe(CREDENTIALS.USER.email);

      // Orden del cliente de SALES responde 403 con common.forbidden
      const otherOrderRes = await api()
        .get(`/api/orders/${salesSeedOrderId}`)
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(otherOrderRes.statusCode).toBe(403);
      expect(otherOrderRes.body.message).toBe(es.common.forbidden);
    });

    test('USER PUT sobre orden ajena y USER DELETE responden 403 con common.forbidden', async () => {
      // USER PUT sobre orden ajena (SALES) responde 403
      const userPutRes = await api()
        .put(`/api/orders/${salesSeedOrderId}`)
        .set('Accept-Language', 'es')
        .set(bearer(userToken))
        .send({
          paymentMethod: 'cash'
        });

      expect(userPutRes.statusCode).toBe(403);
      expect(userPutRes.body.message).toBe(es.common.forbidden);

      // USER DELETE responde 403 (USER no posee permiso delete)
      const userDeleteRes = await api()
        .delete(`/api/orders/${salesSeedOrderId}`)
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(userDeleteRes.statusCode).toBe(403);
      expect(userDeleteRes.body.message).toBe(es.common.forbidden);
    });

    test('Permisos de creación (own vs any) para USER y SALES según la matriz del seed', async () => {
      // USER tiene orders:create:own: puede crear orden para su propio cliente (201)
      const userOwnPayload = buildOrderPayload({ customerId: userCustomerId });
      const userCreateOwnRes = await api()
        .post('/api/orders')
        .set('Accept-Language', 'es')
        .set(bearer(userToken))
        .send(userOwnPayload);

      expect(userCreateOwnRes.statusCode).toBe(201);
      expect(userCreateOwnRes.body.message).toBe(es.orders.created);
      createdOrderIds.push(userCreateOwnRes.body.data._id);

      // USER no puede crear orden para otro cliente (responde 403 con common.forbidden)
      const userOtherPayload = buildOrderPayload({ customerId: salesCustomerId });
      const userCreateOtherRes = await api()
        .post('/api/orders')
        .set('Accept-Language', 'es')
        .set(bearer(userToken))
        .send(userOtherPayload);

      expect(userCreateOtherRes.statusCode).toBe(403);
      expect(userCreateOtherRes.body.message).toBe(es.common.forbidden);

      // SALES tiene orders:create:any: puede crear orden tanto para cliente propio como ajeno (201)
      const salesAnyPayload = buildOrderPayload({ customerId: userCustomerId });
      const salesCreateRes = await api()
        .post('/api/orders')
        .set('Accept-Language', 'es')
        .set(bearer(salesToken))
        .send(salesAnyPayload);

      expect(salesCreateRes.statusCode).toBe(201);
      expect(salesCreateRes.body.message).toBe(es.orders.created);
      createdOrderIds.push(salesCreateRes.body.data._id);
    });
  });
});
