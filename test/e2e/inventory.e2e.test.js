const { api, login, bearer } = require('./helpers');
const es = require('../../locales/es.json');

describe('Inventario de Variantes E2E (/api/inventory)', () => {
  let adminToken;
  let salesToken;
  let userToken;
  let testProductId;
  let variant1Id;
  let variant2Id;
  let sharedInventoryId;
  const createdVariantIds = [];

  beforeAll(async () => {
    adminToken = await login('ADMIN');
    salesToken = await login('SALES');
    userToken = await login('USER');

    // ADMIN crea un producto propio
    const prodRes = await api()
      .post('/api/products')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        categoryId: 1,
        name: `E2E Inventory ${Date.now()}`,
        description: 'Producto base para pruebas E2E de inventario',
        brand: 'Stride & Co.',
        price: '499.00',
        active: true
      });

    testProductId = prodRes.body.data.id;

    // y dos variantes propias con SKU único
    const var1Res = await api()
      .post('/api/variants')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        productId: testProductId,
        sku: `E2E-INV-${Date.now()}-1`,
        size: '41',
        color: 'Negro',
        active: true
      });

    variant1Id = var1Res.body.data.id;
    createdVariantIds.push(variant1Id);

    const var2Res = await api()
      .post('/api/variants')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        productId: testProductId,
        sku: `E2E-INV-${Date.now()}-2`,
        size: '42',
        color: 'Blanco',
        active: true
      });

    variant2Id = var2Res.body.data.id;
    createdVariantIds.push(variant2Id);
  });

  afterAll(async () => {
    // Se borran las variantes (esto borra su inventario)
    for (const id of createdVariantIds) {
      try {
        const check = await api()
          .get(`/api/variants/${id}`)
          .set('Accept-Language', 'es')
          .set(bearer(adminToken));

        if (check.statusCode === 200) {
          await api()
            .delete(`/api/variants/${id}`)
            .set('Accept-Language', 'es')
            .set(bearer(adminToken));
        }
      } catch (_) {
        // ignore
      }
    }

    // Y luego el producto
    if (testProductId) {
      try {
        const check = await api()
          .get(`/api/products/${testProductId}`)
          .set('Accept-Language', 'es')
          .set(bearer(adminToken));

        if (check.statusCode === 200) {
          await api()
            .delete(`/api/products/${testProductId}`)
            .set('Accept-Language', 'es')
            .set(bearer(adminToken));
        }
      } catch (_) {
        // ignore
      }
    }
  });

  test('1. Ciclo completo sobre el inventario de la primera variante', async () => {
    // POST /api/inventory con variantId, stock 10 y reserved 2 responde 201 con el mensaje inventory.created
    const postRes = await api()
      .post('/api/inventory')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        variantId: variant1Id,
        stock: 10,
        reserved: 2
      });

    expect(postRes.statusCode).toBe(201);
    expect(postRes.body.message).toBe(es.inventory.created);
    expect(postRes.body.data).toHaveProperty('id');
    expect(postRes.body.data.stock).toBe(10);
    expect(postRes.body.data.reserved).toBe(2);

    const inventoryId = postRes.body.data.id;

    // GET /api/inventory/:id responde 200 con stock 10 y reserved 2
    const getByIdRes = await api()
      .get(`/api/inventory/${inventoryId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getByIdRes.statusCode).toBe(200);
    expect(getByIdRes.body.data.id).toBe(inventoryId);
    expect(getByIdRes.body.data.stock).toBe(10);
    expect(getByIdRes.body.data.reserved).toBe(2);

    // GET /api/inventory responde 200 y la lista contiene el id
    const listRes = await api()
      .get('/api/inventory')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.some(item => item.id === inventoryId)).toBe(true);

    // PUT con stock 20 responde 200 (verifica con un GET posterior)
    const putRes = await api()
      .put(`/api/inventory/${inventoryId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        stock: 20
      });

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.data.stock).toBe(20);

    const getAfterPutRes = await api()
      .get(`/api/inventory/${inventoryId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getAfterPutRes.statusCode).toBe(200);
    expect(getAfterPutRes.body.data.stock).toBe(20);

    // DELETE responde 200
    const deleteRes = await api()
      .delete(`/api/inventory/${inventoryId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(deleteRes.statusCode).toBe(200);

    // un GET posterior responde 404 con inventory.notFound
    const getAfterDeleteRes = await api()
      .get(`/api/inventory/${inventoryId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getAfterDeleteRes.statusCode).toBe(404);
    expect(getAfterDeleteRes.body.message).toBe(es.inventory.notFound);
  });

  test('2. Relaciones: GET /api/inventory/:id devuelve data.variant con el id de la variante de prueba', async () => {
    // Se crea inventario en variant1Id (cuyo inventario previo fue eliminado en el ciclo de vida)
    const createRes = await api()
      .post('/api/inventory')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        variantId: variant1Id,
        stock: 15,
        reserved: 3
      });

    expect(createRes.statusCode).toBe(201);
    sharedInventoryId = createRes.body.data.id;

    const response = await api()
      .get(`/api/inventory/${sharedInventoryId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveProperty('variant');
    expect(response.body.data.variant).toBeDefined();
    expect(response.body.data.variant.id).toBe(variant1Id);
  });

  test('3. Datos inválidos responden adecuadamente (400 / 404)', async () => {
    // POST sin body responde 400
    const resNoBody = await api()
      .post('/api/inventory')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(resNoBody.statusCode).toBe(400);

    // POST con stock negativo responde 400 con inventory.stockNegative
    const resNegativeStock = await api()
      .post('/api/inventory')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        variantId: variant2Id,
        stock: -1,
        reserved: 0
      });

    expect(resNegativeStock.statusCode).toBe(400);
    expect(resNegativeStock.body.message).toBe(es.inventory.stockNegative);

    // POST con reserved mayor que stock responde 400 con inventory.reservedExceedsStock
    const resReservedExceeds = await api()
      .post('/api/inventory')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        variantId: variant2Id,
        stock: 5,
        reserved: 10
      });

    expect(resReservedExceeds.statusCode).toBe(400);
    expect(resReservedExceeds.body.message).toBe(es.inventory.reservedExceedsStock);

    // Un primer POST sobre la segunda variante responde 201
    const firstPostVariant2 = await api()
      .post('/api/inventory')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        variantId: variant2Id,
        stock: 30,
        reserved: 5
      });

    expect(firstPostVariant2.statusCode).toBe(201);

    // Un segundo POST para una variante que ya tiene inventario responde 400 con common.duplicate (usa la segunda variante)
    const secondPostVariant2 = await api()
      .post('/api/inventory')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        variantId: variant2Id,
        stock: 25,
        reserved: 3
      });

    expect(secondPostVariant2.statusCode).toBe(400);
    expect(secondPostVariant2.body.message).toBe(es.common.duplicate);

    // POST con variantId inexistente (99999999) responde 404 con inventory.variantNotFound
    const resNonExistentVariant = await api()
      .post('/api/inventory')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        variantId: 99999999,
        stock: 10,
        reserved: 0
      });

    expect(resNonExistentVariant.statusCode).toBe(404);
    expect(resNonExistentVariant.body.message).toBe(es.inventory.variantNotFound);

    // GET /api/inventory/abc responde 400 con common.invalidId
    const resInvalidId = await api()
      .get('/api/inventory/abc')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(resInvalidId.statusCode).toBe(400);
    expect(resInvalidId.body.message).toBe(es.common.invalidId);
  });

  describe('4. Control de acceso según la matriz real del seed', () => {
    test('sin token responde 401', async () => {
      const response = await api()
        .get('/api/inventory')
        .set('Accept-Language', 'es');

      expect(response.statusCode).toBe(401);
    });

    test('USER GET /api/inventory responde 200', async () => {
      const response = await api()
        .get('/api/inventory')
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('USER PUT responde 403 con common.forbidden', async () => {
      const response = await api()
        .put(`/api/inventory/${sharedInventoryId}`)
        .set('Accept-Language', 'es')
        .set(bearer(userToken))
        .send({
          stock: 40
        });

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
    });

    test('USER POST responde 403 con common.forbidden', async () => {
      const response = await api()
        .post('/api/inventory')
        .set('Accept-Language', 'es')
        .set(bearer(userToken))
        .send({
          variantId: variant1Id,
          stock: 10,
          reserved: 0
        });

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
    });

    test('SALES PUT responde 200', async () => {
      const response = await api()
        .put(`/api/inventory/${sharedInventoryId}`)
        .set('Accept-Language', 'es')
        .set(bearer(salesToken))
        .send({
          stock: 50
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.data.stock).toBe(50);
    });

    test('SALES POST responde 403 con common.forbidden', async () => {
      const response = await api()
        .post('/api/inventory')
        .set('Accept-Language', 'es')
        .set(bearer(salesToken))
        .send({
          variantId: variant1Id,
          stock: 10,
          reserved: 0
        });

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
    });

    test('SALES DELETE responde 403 con common.forbidden', async () => {
      const response = await api()
        .delete(`/api/inventory/${sharedInventoryId}`)
        .set('Accept-Language', 'es')
        .set(bearer(salesToken));

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
    });
  });
});
