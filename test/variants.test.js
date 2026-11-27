
const request = require('supertest');
const app = require('../app');

const variantService = require('../services/variant.service');
const { VariantServiceError } = variantService;

const { mockSession } = require('./helpers/session');

const es = require('../locales/es.json');
const en = require('../locales/en.json');

const validVariant = {
  productId: 1,
  sku: 'SKU-PRUEBA-001',
  size: '42',
  color: 'Negro'
};

describe('Rutas de variantes (con mocks del servicio)', () => {
  let auth;

  beforeEach(() => {
    auth = mockSession({
      permissions: [
        'variants:create:any',
        'variants:read:any',
        'variants:update:any',
        'variants:delete:any'
      ]
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==========================================
  // GET /api/variants
  // ==========================================

  describe('GET /api/variants', () => {
    test('responde 200 con la lista y mensaje traducido', async () => {
      const variants = [
        { id: 1, sku: 'SKU-001' },
        { id: 2, sku: 'SKU-002' }
      ];

      const listAll = jest
        .spyOn(variantService, 'listAll')
        .mockResolvedValue(variants);

      const response = await request(app)
        .get('/api/variants')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.variants.list);
      expect(response.body.data).toEqual(variants);
      expect(listAll).toHaveBeenCalledTimes(1);
    });

    test('responde en inglés', async () => {
      jest.spyOn(variantService, 'listAll')
        .mockResolvedValue([]);

      const response = await request(app)
        .get('/api/variants')
        .set('Accept-Language', 'en')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(en.variants.list);
    });

    test('responde 403 sin permiso de lectura', async () => {
      const listAll = jest.spyOn(variantService, 'listAll');

      const sinPermiso = mockSession({
        permissions: []
      });

      const response = await request(app)
        .get('/api/variants')
        .set('Accept-Language', 'es')
        .set(sinPermiso);

      expect(response.statusCode).toBe(403);
      expect(listAll).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // GET /api/variants/:id
  // ==========================================

  describe('GET /api/variants/:id', () => {
    test('responde 200 con variante, producto e inventario', async () => {
      const variant = {
        id: 5,
        sku: 'SKU-005',
        product: { id: 1, name: 'Stride Runner' },
        inventory: { stock: 20, reserved: 0 }
      };

      const findById = jest
        .spyOn(variantService, 'findById')
        .mockResolvedValue(variant);

      const response = await request(app)
        .get('/api/variants/5')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.variants.found);
      expect(response.body.data.product).toEqual(variant.product);
      expect(response.body.data.inventory).toEqual(variant.inventory);
      expect(findById).toHaveBeenCalledWith(5);
    });

    test('responde 404 si no existe', async () => {
      jest.spyOn(variantService, 'findById')
        .mockResolvedValue(null);

      const response = await request(app)
        .get('/api/variants/999')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.variants.notFound);
      expect(response.body.data).toBeNull();
    });

    test('responde 400 con identificador inválido', async () => {
      const findById = jest.spyOn(variantService, 'findById');

      const response = await request(app)
        .get('/api/variants/abc')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.invalidId);
      expect(findById).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // POST /api/variants
  // ==========================================

  describe('POST /api/variants', () => {
    test('responde 201 y crea la variante', async () => {
      const created = {
        id: 7,
        product_id: 1,
        sku: 'SKU-PRUEBA-001',
        size: '42',
        color: 'Negro',
        inventory: {
          stock: 0,
          reserved: 0
        }
      };

      const createVariant = jest
        .spyOn(variantService, 'createVariant')
        .mockResolvedValue(created);

      const response = await request(app)
        .post('/api/variants')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(validVariant);

      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe(es.variants.created);
      expect(response.body.data.id).toBe(7);

      expect(createVariant).toHaveBeenCalledTimes(1);

      expect(createVariant).toHaveBeenCalledWith({
        product_id: 1,
        sku: 'SKU-PRUEBA-001',
        size: '42',
        color: 'Negro'
      });
    });

    test('responde 404 si el producto no existe', async () => {
      jest.spyOn(variantService, 'createVariant')
        .mockRejectedValue(
          new VariantServiceError('PRODUCT_NOT_FOUND')
        );

      const response = await request(app)
        .post('/api/variants')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({
          ...validVariant,
          productId: 999999
        });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.variants.productNotFound);
    });

    test('responde 400 si el SKU está duplicado', async () => {
      jest.spyOn(variantService, 'createVariant')
        .mockRejectedValue(
          new VariantServiceError('SKU_DUPLICATE')
        );

      const response = await request(app)
        .post('/api/variants')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(validVariant);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.variants.duplicateSku);
    });

    test.each([
      ['sin body', undefined],
      ['sin SKU', {
        productId: 1,
        size: '42',
        color: 'Negro'
      }],
      ['con SKU vacío', {
        productId: 1,
        sku: '   ',
        size: '42',
        color: 'Negro'
      }],
      ['sin talla', {
        productId: 1,
        sku: 'SKU-X',
        color: 'Negro'
      }],
      ['sin color', {
        productId: 1,
        sku: 'SKU-X',
        size: '42'
      }],
      ['sin producto', {
        sku: 'SKU-X',
        size: '42',
        color: 'Negro'
      }],
      ['con producto inválido', {
        productId: 'abc',
        sku: 'SKU-X',
        size: '42',
        color: 'Negro'
      }],
      ['con campo no permitido', {
        ...validVariant,
        role: 'admin'
      }]
    ])('responde 400 %s sin llamar al servicio', async (_caso, body) => {
      const createVariant = jest.spyOn(variantService, 'createVariant');

      const response = await request(app)
        .post('/api/variants')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(body);

      expect(response.statusCode).toBe(400);
      expect(createVariant).not.toHaveBeenCalled();
    });

    test('responde 403 sin permiso de creación', async () => {
      const createVariant = jest.spyOn(variantService, 'createVariant');

      const sinPermiso = mockSession({
        permissions: ['variants:read:any']
      });

      const response = await request(app)
        .post('/api/variants')
        .set('Accept-Language', 'es')
        .set(sinPermiso)
        .send(validVariant);

      expect(response.statusCode).toBe(403);
      expect(createVariant).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // PUT /api/variants/:id
  // ==========================================

  describe('PUT /api/variants/:id', () => {
    test('responde 200 y actualiza la variante', async () => {
      const updated = {
        id: 3,
        sku: 'SKU-003',
        size: '44',
        color: 'Blanco'
      };

      const updateVariant = jest
        .spyOn(variantService, 'updateVariant')
        .mockResolvedValue(updated);

      const response = await request(app)
        .put('/api/variants/3')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({
          size: '44',
          color: 'Blanco'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.variants.updated);

      expect(updateVariant).toHaveBeenCalledWith(3, {
        size: '44',
        color: 'Blanco'
      });
    });

    test('responde 404 si la variante no existe', async () => {
      jest.spyOn(variantService, 'updateVariant')
        .mockResolvedValue(null);

      const response = await request(app)
        .put('/api/variants/999')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({
          size: '44'
        });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.variants.notFound);
    });

    test('responde 400 si el SKU queda vacío', async () => {
      const updateVariant = jest.spyOn(variantService, 'updateVariant');

      const response = await request(app)
        .put('/api/variants/3')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({
          sku: '   '
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.variants.skuRequired);
      expect(updateVariant).not.toHaveBeenCalled();
    });

    test('responde 400 con un ID inválido', async () => {
      const updateVariant = jest.spyOn(variantService, 'updateVariant');

      const response = await request(app)
        .put('/api/variants/abc')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({
          size: '44'
        });

      expect(response.statusCode).toBe(400);
      expect(updateVariant).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // DELETE /api/variants/:id
  // ==========================================

  describe('DELETE /api/variants/:id', () => {
    test('responde 200 y elimina la variante', async () => {
      const deleted = {
        id: 3,
        sku: 'SKU-003'
      };

      const deleteVariant = jest
        .spyOn(variantService, 'deleteVariant')
        .mockResolvedValue(deleted);

      const response = await request(app)
        .delete('/api/variants/3')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.variants.deleted);
      expect(response.body.data.id).toBe(3);
      expect(deleteVariant).toHaveBeenCalledWith(3);
    });

    test('responde 404 si no existe la variante', async () => {
      jest.spyOn(variantService, 'deleteVariant')
        .mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/variants/999')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.variants.notFound);
    });

    test('responde 403 sin permiso de eliminación', async () => {
      const deleteVariant = jest.spyOn(variantService, 'deleteVariant');

      const sinPermiso = mockSession({
        permissions: ['variants:read:any']
      });

      const response = await request(app)
        .delete('/api/variants/3')
        .set('Accept-Language', 'es')
        .set(sinPermiso);

      expect(response.statusCode).toBe(403);
      expect(deleteVariant).not.toHaveBeenCalled();
    });
  });
});