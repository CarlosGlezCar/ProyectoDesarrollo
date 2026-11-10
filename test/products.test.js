const request = require('supertest');
const app = require('../app');
const { Product } = require('../models/sql');
const { mockSession } = require('./helpers/session');
const es = require('../locales/es.json');
const en = require('../locales/en.json');

const validProduct = {
  categoryId: 1,
  name: 'Tenis de prueba',
  description: 'Producto para pruebas con mocks',
  brand: 'Stride & Co.',
  price: '99.99'
};

describe('Rutas de productos (con mocks)', () => {
  let auth;

  beforeEach(() => {
    auth = mockSession({
      permissions: [
        'products:create:any',
        'products:read:any',
        'products:update:any',
        'products:delete:any'
      ]
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/products', () => {
    test('responde 200 con la lista y el mensaje traducido', async () => {
      jest.spyOn(Product, 'findAll').mockResolvedValue([{ id: 1, name: 'A' }]);

      const response = await request(app)
        .get('/api/products')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.products.list);
      expect(response.body.data).toEqual([{ id: 1, name: 'A' }]);
    });

    test('responde en inglés con Accept-Language: en', async () => {
      jest.spyOn(Product, 'findAll').mockResolvedValue([]);

      const response = await request(app)
        .get('/api/products')
        .set('Accept-Language', 'en')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(en.products.list);
    });

    test('responde 403 si el rol no tiene products:read:any', async () => {
      const sinPermiso = mockSession({ permissions: [] });

      const response = await request(app)
        .get('/api/products')
        .set('Accept-Language', 'es')
        .set(sinPermiso);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
    });
  });

  describe('GET /api/products/:id', () => {
    test('responde 200 si el producto existe', async () => {
      jest.spyOn(Product, 'findByPk').mockResolvedValue({ id: 5, name: 'A' });

      const response = await request(app)
        .get('/api/products/5')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.products.found);
      expect(response.body.data.id).toBe(5);
    });

    test('responde 404 si no existe', async () => {
      jest.spyOn(Product, 'findByPk').mockResolvedValue(null);

      const response = await request(app)
        .get('/api/products/999')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.products.notFound);
      expect(response.body.data).toBeNull();
    });

    test('responde 400 con un id mal formado', async () => {
      const response = await request(app)
        .get('/api/products/abc')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.invalidId);
    });
  });

  describe('POST /api/products', () => {
    test('responde 201 y crea el producto', async () => {
      const create = jest
        .spyOn(Product, 'create')
        .mockResolvedValue({ id: 10, ...validProduct });

      const response = await request(app)
        .post('/api/products')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(validProduct);

      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe(es.products.created);
      expect(create).toHaveBeenCalledTimes(1);
      expect(create.mock.calls[0][0]).toMatchObject({
        category_id: 1,
        name: 'Tenis de prueba'
      });
    });

    test.each([
      ['sin body', undefined],
      ['sin name', { ...validProduct, name: undefined }],
      ['con name vacío', { ...validProduct, name: '   ' }],
      ['con price no numérico', { ...validProduct, price: 'abc' }],
      ['con price negativo', { ...validProduct, price: '-5' }],
      ['con un campo no permitido', { ...validProduct, role: 'admin' }]
    ])('responde 400 %s y no llama a la base', async (_caso, body) => {
      const create = jest.spyOn(Product, 'create');

      const response = await request(app)
        .post('/api/products')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(body);

      expect(response.statusCode).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });

    test('responde 403 si el rol no tiene products:create:any', async () => {
      const soloLectura = mockSession({ permissions: ['products:read:any'] });
      const create = jest.spyOn(Product, 'create');

      const response = await request(app)
        .post('/api/products')
        .set('Accept-Language', 'es')
        .set(soloLectura)
        .send(validProduct);

      expect(response.statusCode).toBe(403);
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('PUT y DELETE /api/products/:id', () => {
    test('PUT responde 200 y actualiza', async () => {
      const update = jest.fn().mockResolvedValue();
      jest.spyOn(Product, 'findByPk').mockResolvedValue({ id: 3, update });

      const response = await request(app)
        .put('/api/products/3')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ price: '120.50' });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.products.updated);
      expect(update).toHaveBeenCalledWith({ price: '120.50' });
    });

    test('PUT responde 404 si no existe', async () => {
      jest.spyOn(Product, 'findByPk').mockResolvedValue(null);

      const response = await request(app)
        .put('/api/products/999')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ price: '120.50' });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.products.notFound);
    });

    test('DELETE responde 200 y elimina', async () => {
      const destroy = jest.fn().mockResolvedValue();
      jest.spyOn(Product, 'findByPk').mockResolvedValue({ id: 3, destroy });

      const response = await request(app)
        .delete('/api/products/3')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.products.deleted);
      expect(destroy).toHaveBeenCalledTimes(1);
    });

    test('DELETE responde 403 sin permiso y no elimina', async () => {
      const sinPermiso = mockSession({ permissions: ['products:read:any'] });
      const find = jest.spyOn(Product, 'findByPk');

      const response = await request(app)
        .delete('/api/products/3')
        .set('Accept-Language', 'es')
        .set(sinPermiso);

      expect(response.statusCode).toBe(403);
      expect(find).not.toHaveBeenCalled();
    });
  });
});