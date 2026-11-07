const { api, login, bearer } = require('./helpers');
const es = require('../../locales/es.json');

describe('Catálogo de Productos E2E (/api/products)', () => {
  let adminToken;
  let userToken;
  const createdProductIds = [];

  async function createTestProduct(suffix = '') {
    const response = await api()
      .post('/api/products')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        categoryId: 1,
        name: `E2E Products ${Date.now()} ${suffix}`.trim(),
        description: 'Producto para pruebas E2E de catálogo',
        brand: 'Stride & Co.',
        price: '99.99',
        active: true
      });

    const productId = response.body.data?.id;
    if (productId) {
      createdProductIds.push(productId);
    }
    return productId;
  }

  beforeAll(async () => {
    adminToken = await login('ADMIN');
    userToken = await login('USER');
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

  test('1. Ciclo completo sobre un producto propio con nombre único', async () => {
    const uniqueName = `E2E Products ${Date.now()}`;
    const initialProductData = {
      categoryId: 1,
      name: uniqueName,
      description: 'Tenis de entrenamiento para ciclo completo',
      brand: 'Stride & Co.',
      price: '129.99',
      active: true
    };

    // POST responde 201 con data.id y el mensaje products.created
    const postRes = await api()
      .post('/api/products')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send(initialProductData);

    expect(postRes.statusCode).toBe(201);
    expect(postRes.body.data).toHaveProperty('id');
    expect(typeof postRes.body.data.id).toBe('number');
    expect(postRes.body.message).toBe(es.products.created);

    const productId = postRes.body.data.id;
    createdProductIds.push(productId);

    // GET /api/products/:id responde 200 con los mismos datos
    const getByIdRes = await api()
      .get(`/api/products/${productId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getByIdRes.statusCode).toBe(200);
    expect(getByIdRes.body.data.id).toBe(productId);
    expect(getByIdRes.body.data.name).toBe(uniqueName);
    expect(getByIdRes.body.data.brand).toBe('Stride & Co.');
    expect(getByIdRes.body.data.description).toBe('Tenis de entrenamiento para ciclo completo');
    expect(Number(getByIdRes.body.data.price)).toBe(129.99);

    // GET /api/products responde 200 y la lista contiene el id
    const listRes = await api()
      .get('/api/products')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    const foundInList = listRes.body.data.some(product => product.id === productId);
    expect(foundInList).toBe(true);

    // PUT cambia name y price y responde 200 con los datos nuevos
    const updatedName = `${uniqueName} Actualizado`;
    const updatedPrice = '179.50';

    const putRes = await api()
      .put(`/api/products/${productId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: updatedName,
        price: updatedPrice
      });

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.data.name).toBe(updatedName);
    expect(Number(putRes.body.data.price)).toBe(179.5);

    // Comprueba con un GET posterior
    const getAfterPutRes = await api()
      .get(`/api/products/${productId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getAfterPutRes.statusCode).toBe(200);
    expect(getAfterPutRes.body.data.name).toBe(updatedName);
    expect(Number(getAfterPutRes.body.data.price)).toBe(179.5);

    // DELETE responde 200
    const deleteRes = await api()
      .delete(`/api/products/${productId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(deleteRes.statusCode).toBe(200);

    // Un GET posterior responde 404 con el mensaje products.notFound
    const getAfterDeleteRes = await api()
      .get(`/api/products/${productId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getAfterDeleteRes.statusCode).toBe(404);
    expect(getAfterDeleteRes.body.message).toBe(es.products.notFound);
  });

  test('2. Relaciones del producto del seed "Tenis deportivos Stride"', async () => {
    const listRes = await api()
      .get('/api/products')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);

    const seedProduct = listRes.body.data.find(
      product => product.name === 'Tenis deportivos Stride'
    );

    expect(seedProduct).toBeDefined();
    expect(Array.isArray(seedProduct.variants)).toBe(true);
    expect(seedProduct.variants.length).toBeGreaterThan(0);

    for (const variant of seedProduct.variants) {
      expect(variant).toHaveProperty('inventory');
      expect(variant.inventory).toBeDefined();
      expect(variant.inventory).not.toBeNull();
    }
  });

  test('3. Datos inválidos responden 400', async () => {
    // POST sin body
    const resSinBody = await api()
      .post('/api/products')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(resSinBody.statusCode).toBe(400);

    // POST sin name
    const resSinName = await api()
      .post('/api/products')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        categoryId: 1,
        description: 'Sin nombre',
        brand: 'Stride',
        price: '50.00',
        active: true
      });

    expect(resSinName.statusCode).toBe(400);

    // POST con price "abc"
    const resPriceAbc = await api()
      .post('/api/products')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        categoryId: 1,
        name: `E2E Inv Price Abc ${Date.now()}`,
        description: 'Precio inválido',
        brand: 'Stride',
        price: 'abc',
        active: true
      });

    expect(resPriceAbc.statusCode).toBe(400);

    // POST con price "-5"
    const resPriceNegativo = await api()
      .post('/api/products')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        categoryId: 1,
        name: `E2E Inv Price Neg ${Date.now()}`,
        description: 'Precio negativo',
        brand: 'Stride',
        price: '-5',
        active: true
      });

    expect(resPriceNegativo.statusCode).toBe(400);

    // POST con name vacío ""
    const resNameVacio = await api()
      .post('/api/products')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        categoryId: 1,
        name: '',
        description: 'Nombre vacío',
        brand: 'Stride',
        price: '50.00',
        active: true
      });

    expect(resNameVacio.statusCode).toBe(400);

    // PUT con price "abc" sobre un producto propio
    const tempProductId = await createTestProduct('invalid-put');
    const resPutPriceAbc = await api()
      .put(`/api/products/${tempProductId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({ price: 'abc' });

    expect(resPutPriceAbc.statusCode).toBe(400);

    // GET /api/products/abc (id mal formado, mensaje common.invalidId)
    const resGetMalFormado = await api()
      .get('/api/products/abc')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(resGetMalFormado.statusCode).toBe(400);
    expect(resGetMalFormado.body.message).toBe(es.common.invalidId);
  });

  test('4. GET /api/products sin token responde 401, y USER POST /api/products responde 403 con common.forbidden', async () => {
    // GET /api/products sin token responde 401
    const resNoToken = await api()
      .get('/api/products')
      .set('Accept-Language', 'es');

    expect(resNoToken.statusCode).toBe(401);

    // USER POST /api/products responde 403 con common.forbidden
    const resUserPost = await api()
      .post('/api/products')
      .set('Accept-Language', 'es')
      .set(bearer(userToken))
      .send({
        categoryId: 1,
        name: `E2E Forbidden User ${Date.now()}`,
        description: 'Intento no autorizado',
        brand: 'Stride',
        price: '99.99',
        active: true
      });

    expect(resUserPost.statusCode).toBe(403);
    expect(resUserPost.body.message).toBe(es.common.forbidden);
  });
});
