const { api, login, bearer } = require('./helpers');
const es = require('../../locales/es.json');

describe('Variantes de Productos E2E (/api/variants)', () => {
  let adminToken;
  let salesToken;
  let userToken;
  let testProductId;
  const createdVariantIds = [];

  async function createTestVariant(suffix = '', size = 'M', color = 'Negro') {
    const response = await api()
      .post('/api/variants')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        productId: testProductId,
        sku: `E2E-SKU-${Date.now()}-${suffix}`.trim(),
        size,
        color,
        active: true
      });

    const variant = response.body.data;
    if (variant?.id) {
      createdVariantIds.push(variant.id);
    }
    return variant;
  }

  beforeAll(async () => {
    adminToken = await login('ADMIN');
    salesToken = await login('SALES');
    userToken = await login('USER');

    const prodRes = await api()
      .post('/api/products')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        categoryId: 1,
        name: `E2E Variants ${Date.now()}`,
        description: 'Producto base para pruebas de variantes',
        brand: 'Stride & Co.',
        price: '999.00',
        active: true
      });

    testProductId = prodRes.body.data.id;
  });

  afterAll(async () => {
    for (const id of createdVariantIds) {
      try {
        const checkRes = await api()
          .get(`/api/variants/${id}`)
          .set('Accept-Language', 'es')
          .set(bearer(adminToken));

        if (checkRes.statusCode === 200) {
          await api()
            .delete(`/api/variants/${id}`)
            .set('Accept-Language', 'es')
            .set(bearer(adminToken));
        }
      } catch (_) {
        // ignore
      }
    }

    if (testProductId) {
      try {
        const checkProd = await api()
          .get(`/api/products/${testProductId}`)
          .set('Accept-Language', 'es')
          .set(bearer(adminToken));

        if (checkProd.statusCode === 200) {
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

  test('1. Ciclo completo sobre una variante propia con SKU único', async () => {
    const sku = `E2E-SKU-${Date.now()}`;

    // POST responde 201 con data.id y el mensaje variants.created
    const postRes = await api()
      .post('/api/variants')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        productId: testProductId,
        sku,
        size: '40',
        color: 'Azul',
        active: true
      });

    expect(postRes.statusCode).toBe(201);
    expect(postRes.body.data).toHaveProperty('id');
    expect(typeof postRes.body.data.id).toBe('number');
    expect(postRes.body.message).toBe(es.variants.created);

    const variantId = postRes.body.data.id;
    createdVariantIds.push(variantId);

    // GET /api/variants/:id responde 200
    const getByIdRes = await api()
      .get(`/api/variants/${variantId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getByIdRes.statusCode).toBe(200);
    expect(getByIdRes.body.data.id).toBe(variantId);
    expect(getByIdRes.body.data.sku).toBe(sku);

    // GET /api/variants responde 200 y la lista contiene el id
    const listRes = await api()
      .get('/api/variants')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.some(v => v.id === variantId)).toBe(true);

    // PUT cambia size y color y responde 200 (verifica con un GET posterior)
    const putRes = await api()
      .put(`/api/variants/${variantId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        size: '42',
        color: 'Verde'
      });

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.data.size).toBe('42');
    expect(putRes.body.data.color).toBe('Verde');

    const getAfterPutRes = await api()
      .get(`/api/variants/${variantId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getAfterPutRes.statusCode).toBe(200);
    expect(getAfterPutRes.body.data.size).toBe('42');
    expect(getAfterPutRes.body.data.color).toBe('Verde');

    // DELETE responde 200
    const deleteRes = await api()
      .delete(`/api/variants/${variantId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(deleteRes.statusCode).toBe(200);

    // Un GET posterior responde 404 con variants.notFound
    const getAfterDeleteRes = await api()
      .get(`/api/variants/${variantId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getAfterDeleteRes.statusCode).toBe(404);
    expect(getAfterDeleteRes.body.message).toBe(es.variants.notFound);
  });

  test('2. Relaciones: GET /api/variants/:id devuelve data.product con el id del producto de prueba y la propiedad inventory', async () => {
    const variantData = await createTestVariant('relaciones', '38', 'Negro');

    const response = await api()
      .get(`/api/variants/${variantData.id}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveProperty('product');
    expect(response.body.data.product).toBeDefined();
    expect(response.body.data.product.id).toBe(testProductId);
    expect(response.body.data).toHaveProperty('inventory');
  });

  test('3. Datos inválidos responden adecuadamente (400 / 404)', async () => {
    // POST sin body responde 400
    const resNoBody = await api()
      .post('/api/variants')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(resNoBody.statusCode).toBe(400);

    // POST sin sku responde 400
    const resNoSku = await api()
      .post('/api/variants')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        productId: testProductId
      });

    expect(resNoSku.statusCode).toBe(400);

    // POST con un sku repetido (el de una variante existente) responde 400
    const existingVariant = await createTestVariant('duplicate-base');

    const resDuplicateSku = await api()
      .post('/api/variants')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        productId: testProductId,
        sku: existingVariant.sku
      });

    expect(resDuplicateSku.statusCode).toBe(400);
    expect([es.variants.duplicateSku, es.common.duplicate]).toContain(resDuplicateSku.body.message);

    // POST con productId inexistente responde 404 con variants.productNotFound
    const resNoProduct = await api()
      .post('/api/variants')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        productId: 99999999,
        sku: `E2E-NONEXISTENT-${Date.now()}`
      });

    expect(resNoProduct.statusCode).toBe(404);
    expect(resNoProduct.body.message).toBe(es.variants.productNotFound);

    // GET /api/variants/abc responde 400 con common.invalidId
    const resInvalidId = await api()
      .get('/api/variants/abc')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(resInvalidId.statusCode).toBe(400);
    expect(resInvalidId.body.message).toBe(es.common.invalidId);
  });

  describe('4. Control de acceso según la matriz de permisos', () => {
    test('GET /api/variants sin token responde 401', async () => {
      const response = await api()
        .get('/api/variants')
        .set('Accept-Language', 'es');

      expect(response.statusCode).toBe(401);
    });

    test('SALES GET /api/variants responde 200', async () => {
      const response = await api()
        .get('/api/variants')
        .set('Accept-Language', 'es')
        .set(bearer(salesToken));

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('USER GET /api/variants responde 200 según la matriz real de permisos (variants:read:any)', async () => {
      const response = await api()
        .get('/api/variants')
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('USER POST /api/variants responde 403 con common.forbidden por carecer de permiso de creación', async () => {
      const response = await api()
        .post('/api/variants')
        .set('Accept-Language', 'es')
        .set(bearer(userToken))
        .send({
          productId: testProductId,
          sku: `E2E-FORBIDDEN-${Date.now()}`
        });

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
    });

    test('SALES DELETE de una variante propia responde 403 con common.forbidden', async () => {
      const variant = await createTestVariant('sales-del');

      const response = await api()
        .delete(`/api/variants/${variant.id}`)
        .set('Accept-Language', 'es')
        .set(bearer(salesToken));

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
    });
  });
});
