const { api, login, bearer, CREDENTIALS } = require('./helpers');
const es = require('../../locales/es.json');

describe('Control de acceso basado en roles E2E', () => {
  let adminToken;
  let salesToken;
  let userToken;
  let userOrderId;
  let salesOrderId;
  const createdProductIds = [];

  async function createTestProduct(suffix = '') {
    const response = await api()
      .post('/api/products')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        categoryId: 1,
        name: `E2E RBAC ${Date.now()} ${suffix}`.trim(),
        description: 'Producto de prueba para verificación RBAC',
        brand: 'Stride & Co.',
        price: '99.99',
        active: true
      });

    expect(response.statusCode).toBe(201);
    const id = response.body.data.id;
    createdProductIds.push(id);
    return id;
  }

  beforeAll(async () => {
    adminToken = await login('ADMIN');
    salesToken = await login('SALES');
    userToken = await login('USER');

    const ordersRes = await api()
      .get('/api/orders')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    const orders = ordersRes.body.data;
    const userOrder = orders.find(
      order => order.customerId && order.customerId.email === CREDENTIALS.USER.email
    );
    const salesOrder = orders.find(
      order => order.customerId && order.customerId.email === CREDENTIALS.SALES.email
    );
    if (!userOrder || !salesOrder) {
      throw new Error('No se encontraron las órdenes del seed. ¿Se ejecutó npm run seed?');
    }

    userOrderId = userOrder._id || userOrder.id;
    salesOrderId = salesOrder._id || salesOrder.id;
  });

  afterAll(async () => {
    for (const id of createdProductIds) {
      try {
        const checkRes = await api()
          .get(`/api/products/${id}`)
          .set('Accept-Language', 'es')
          .set(bearer(adminToken));

        if (checkRes.statusCode === 200) {
          await api()
            .delete(`/api/products/${id}`)
            .set('Accept-Language', 'es')
            .set(bearer(adminToken));
        }
      } catch (_) {
        // ignore
      }
    }
  });

  describe('Control de acceso a productos', () => {
    test('ADMIN DELETE /api/products/:id sobre su producto de prueba responde 200, y después GET del mismo id responde 404', async () => {
      const productId = await createTestProduct('admin-delete');

      const deleteRes = await api()
        .delete(`/api/products/${productId}`)
        .set('Accept-Language', 'es')
        .set(bearer(adminToken));

      expect(deleteRes.statusCode).toBe(200);

      const getRes = await api()
        .get(`/api/products/${productId}`)
        .set('Accept-Language', 'es')
        .set(bearer(adminToken));

      expect(getRes.statusCode).toBe(404);
    });

    test('SALES DELETE /api/products/:id sobre un producto de prueba responde 403 con el mensaje de common.forbidden, y después ADMIN comprueba con GET que el producto sigue existiendo (200)', async () => {
      const productId = await createTestProduct('sales-delete');

      const deleteRes = await api()
        .delete(`/api/products/${productId}`)
        .set('Accept-Language', 'es')
        .set(bearer(salesToken));

      expect(deleteRes.statusCode).toBe(403);
      expect(deleteRes.body.message).toBe(es.common.forbidden);

      const getRes = await api()
        .get(`/api/products/${productId}`)
        .set('Accept-Language', 'es')
        .set(bearer(adminToken));

      expect(getRes.statusCode).toBe(200);
    });
  });

  describe('Control de acceso a órdenes', () => {
    test('USER GET /api/orders/:id con su propia orden responde 200 y data.customerId.email es el correo de USER', async () => {
      const response = await api()
        .get(`/api/orders/${userOrderId}`)
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(response.statusCode).toBe(200);
      expect(response.body.data.customerId.email).toBe(CREDENTIALS.USER.email);
    });

    test('USER GET /api/orders/:id con la orden del cliente de SALES responde 403 con el mensaje de common.forbidden', async () => {
      const response = await api()
        .get(`/api/orders/${salesOrderId}`)
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
    });

    test('USER GET /api/orders (orders:read:any) responde 403 con el mensaje de common.forbidden', async () => {
      const response = await api()
        .get('/api/orders')
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
    });

    test('SALES GET /api/orders responde 200', async () => {
      const response = await api()
        .get('/api/orders')
        .set('Accept-Language', 'es')
        .set(bearer(salesToken));

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('USER GET /api/orders/own responde 200 y todas las órdenes devueltas pertenecen a USER', async () => {
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
  });
});
