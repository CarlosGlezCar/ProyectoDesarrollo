
const request = require('supertest');
const app = require('../app');

const variantService = require('../services/variant.service');
const { VariantServiceError } = variantService;

const { mockSession } = require('./helpers/session');

const sampleProduct = {
  id: 1,
  name: 'Stride Runner X',
  active: true
};

const sampleVariant = {
  id: 1,
  product_id: 1,
  sku: 'STRIDE-TEST-27',
  size: '27',
  color: 'Negro',
  active: true,
  product: sampleProduct,
  inventory: {
    stock: 20,
    reserved: 2
  }
};

const validForm = {
  productId: '1',
  sku: 'STRIDE-TEST-27',
  size: '27',
  color: 'Negro'
};

const permissions = [
  'variants:read:any',
  'variants:create:any',
  'variants:update:any'
];

// Utilizar el JWT simulado como cookie web
function sessionCookie(grantedPermissions = permissions) {
  const headers = mockSession({
    permissions: grantedPermissions
  });

  const authorization = Object.entries(headers)
    .find(([key]) => key.toLowerCase() === 'authorization')[1];

  const token = authorization.replace(/^Bearer\s+/i, '');

  return `access_token=${token}`;
}

beforeEach(() => {
  jest.spyOn(variantService, 'listAll')
    .mockResolvedValue([sampleVariant]);

  jest.spyOn(variantService, 'listProducts')
    .mockResolvedValue([sampleProduct]);

  jest.spyOn(variantService, 'findById')
    .mockResolvedValue(sampleVariant);

  jest.spyOn(variantService, 'createVariant')
    .mockResolvedValue(sampleVariant);

  jest.spyOn(variantService, 'updateVariant')
    .mockResolvedValue(sampleVariant);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('F9 - Administracion SSR de variantes', () => {

  test('Muestra variantes en HTML', async () => {
    const response = await request(app)
      .get('/admin/variants?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.headers['content-type'])
      .toContain('text/html');

    expect(response.text)
      .toContain('STRIDE-TEST-27');

    expect(response.text)
      .toContain('Stride Runner X');

    expect(response.text)
      .not.toContain('password_hash');

    expect(response.text)
      .not.toContain('salt_key');
  });

  test('Redirige al login si no existe sesion', async () => {
    const response = await request(app)
      .get('/admin/variants');

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toContain('/login');
  });

  test('Devuelve 403 sin permiso de lectura', async () => {
    await request(app)
      .get('/admin/variants')
      .set('Cookie', sessionCookie([]))
      .expect(403);

    expect(variantService.listAll)
      .not.toHaveBeenCalled();
  });

  test('Muestra el formulario de creacion', async () => {
    const response = await request(app)
      .get('/admin/variants/new?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Crear variante');

    expect(response.text)
      .toContain('Stride Runner X');
  });

  test('Crea una variante y responde 302', async () => {
    const response = await request(app)
      .post('/admin/variants')
      .set('Cookie', sessionCookie())
      .type('form')
      .send(validForm);

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toBe('/admin/variants');

    expect(variantService.createVariant)
      .toHaveBeenCalledWith({
        product_id: 1,
        sku: 'STRIDE-TEST-27',
        size: '27',
        color: 'Negro'
      });

    expect(response.headers['set-cookie'].join(';'))
      .toContain('flash=');
  });

  test('Rechaza un SKU vacio y conserva valores', async () => {
    const response = await request(app)
      .post('/admin/variants?lang=es')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        ...validForm,
        sku: ''
      });

    expect(response.status).toBe(400);

    expect(response.text)
      .toContain('El SKU es obligatorio.');

    expect(response.text)
      .toContain('Negro');

    expect(variantService.createVariant)
      .not.toHaveBeenCalled();
  });

  test('Rechaza un SKU duplicado', async () => {
    variantService.createVariant.mockRejectedValue(
      new VariantServiceError('SKU_DUPLICATE')
    );

    const response = await request(app)
      .post('/admin/variants?lang=es')
      .set('Cookie', sessionCookie())
      .type('form')
      .send(validForm);

    expect(response.status).toBe(400);

    expect(response.text)
      .toContain('Este SKU ya está registrado.');

    expect(response.text)
      .toContain('STRIDE-TEST-27');
  });

  test('Rechaza un producto inexistente', async () => {
    variantService.createVariant.mockRejectedValue(
      new VariantServiceError('PRODUCT_NOT_FOUND')
    );

    const response = await request(app)
      .post('/admin/variants?lang=es')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        ...validForm,
        productId: '999'
      });

    expect(response.status).toBe(400);

    expect(response.text)
      .toContain('El producto seleccionado no existe o no es válido.');
  });

  test('Muestra el formulario de edicion', async () => {
    const response = await request(app)
      .get('/admin/variants/1/edit')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('STRIDE-TEST-27');

    expect(variantService.findById)
      .toHaveBeenCalledWith(1);
  });

  test('Actualiza una variante mediante PRG', async () => {
    const response = await request(app)
      .post('/admin/variants/1')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        ...validForm,
        size: '28'
      });

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toBe('/admin/variants');

    expect(variantService.updateVariant)
      .toHaveBeenCalledWith(1, {
        product_id: 1,
        sku: 'STRIDE-TEST-27',
        size: '28',
        color: 'Negro'
      });
  });

  test('Devuelve 404 si la variante no existe', async () => {
    variantService.findById.mockResolvedValue(null);

    await request(app)
      .get('/admin/variants/999999/edit')
      .set('Cookie', sessionCookie())
      .expect(404);
  });

  test('Impide crear variantes sin permiso', async () => {
    await request(app)
      .post('/admin/variants')
      .set('Cookie', sessionCookie(['variants:read:any']))
      .type('form')
      .send(validForm)
      .expect(403);

    expect(variantService.createVariant)
      .not.toHaveBeenCalled();
  });

  test('Renderiza la pagina en ingles', async () => {
    const response = await request(app)
      .get('/admin/variants?lang=en')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Variant management');
  });

  test('Muestra un mensaje si no hay variantes', async () => {
    variantService.listAll.mockResolvedValue([]);

    const response = await request(app)
      .get('/admin/variants?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Todavía no hay variantes registradas.');
  });

});