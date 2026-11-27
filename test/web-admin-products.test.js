const request = require('supertest');
const app = require('../app');

const productService = require('../services/product.service');

const { mockSession } = require('./helpers/session');

const sampleProduct = {
  id: 1,
  category_id: 1,
  name: 'Stride Runner X',
  description: 'Tenis para correr',
  brand: 'Stride & Co.',
  price: '1899.00',
  active: true,
  variants: []
};

const validForm = {
  categoryId: '1',
  name: 'Stride Runner X',
  description: 'Tenis para correr',
  brand: 'Stride & Co.',
  price: '1899.00',
  active: 'true'
};

const permissions = [
  'products:read:any',
  'products:create:any',
  'products:update:any',
  'products:delete:any'
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
  jest.spyOn(productService, 'listAll')
    .mockResolvedValue([sampleProduct]);

  jest.spyOn(productService, 'findById')
    .mockResolvedValue(sampleProduct);

  jest.spyOn(productService, 'createProduct')
    .mockResolvedValue(sampleProduct);

  jest.spyOn(productService, 'updateProduct')
    .mockResolvedValue(sampleProduct);

  jest.spyOn(productService, 'changeStatus')
    .mockResolvedValue(sampleProduct);

  jest.spyOn(productService, 'deleteProduct')
    .mockResolvedValue({ product: sampleProduct, deleted: true });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('F8 - Administracion SSR de productos', () => {

  test('Muestra productos en HTML', async () => {
    const response = await request(app)
      .get('/admin/products?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.headers['content-type'])
      .toContain('text/html');

    expect(response.text)
      .toContain('Stride Runner X');

    expect(response.text)
      .toContain('<title>Administración de productos');

    expect(response.text)
      .toContain('<meta name="description"');

    expect(response.text)
      .not.toContain('password_hash');

    expect(response.text)
      .not.toContain('salt_key');
  });

  test('Redirige al login si no existe sesion', async () => {
    const response = await request(app)
      .get('/admin/products');

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toContain('/login');
  });

  test('Devuelve 403 sin permiso de lectura', async () => {
    const response = await request(app)
      .get('/admin/products')
      .set('Cookie', sessionCookie([]));

    expect(response.status).toBe(403);

    expect(response.headers['content-type'])
      .toContain('text/html');

    expect(productService.listAll)
      .not.toHaveBeenCalled();
  });

  test('Oculta el boton Nuevo producto sin permiso de creacion', async () => {
    const response = await request(app)
      .get('/admin/products?lang=es')
      .set('Cookie', sessionCookie(['products:read:any']));

    expect(response.status).toBe(200);

    expect(response.text)
      .not.toContain('href="/admin/products/new"');
  });

  test('Muestra el formulario de creacion', async () => {
    const response = await request(app)
      .get('/admin/products/new?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Crear producto');
  });

  test('Crea un producto y responde 302 (PRG)', async () => {
    const response = await request(app)
      .post('/admin/products')
      .set('Cookie', sessionCookie())
      .type('form')
      .send(validForm);

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toBe('/admin/products');

    expect(productService.createProduct)
      .toHaveBeenCalledWith({
        category_id: 1,
        name: 'Stride Runner X',
        description: 'Tenis para correr',
        brand: 'Stride & Co.',
        price: '1899.00',
        active: true
      });

    expect(response.headers['set-cookie'].join(';'))
      .toContain('flash=');
  });

  test('Rechaza datos invalidos con 400 y conserva valores', async () => {
    const response = await request(app)
      .post('/admin/products?lang=es')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        ...validForm,
        name: '',
        price: 'abc',
        brand: 'Marca Capturada'
      });

    expect(response.status).toBe(400);

    expect(response.text)
      .toContain('El nombre del producto es obligatorio.');

    expect(response.text)
      .toContain('Ingresa un precio válido con hasta dos decimales.');

    expect(response.text)
      .toContain('Marca Capturada');

    expect(productService.createProduct)
      .not.toHaveBeenCalled();
  });

  test('Rechaza una categoria invalida', async () => {
    const response = await request(app)
      .post('/admin/products?lang=es')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({ ...validForm, categoryId: '99' });

    expect(response.status).toBe(400);

    expect(response.text)
      .toContain('La categoría seleccionada no es válida.');
  });

  test('Muestra el formulario de edicion con los datos', async () => {
    const response = await request(app)
      .get('/admin/products/1/edit?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Editar producto');

    expect(response.text)
      .toContain('Stride Runner X');
  });

  test('Actualiza un producto mediante PRG', async () => {
    const response = await request(app)
      .post('/admin/products/1')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({ ...validForm, price: '1999.50' });

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toBe('/admin/products');

    expect(productService.updateProduct)
      .toHaveBeenCalled();
  });

  test('Desactiva un producto mediante PRG', async () => {
    const response = await request(app)
      .post('/admin/products/1/status')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({ active: 'false' });

    expect(response.status).toBe(302);

    expect(productService.changeStatus)
      .toHaveBeenCalledWith(1, false);
  });

  test('No elimina un producto con variantes', async () => {
    productService.deleteProduct.mockResolvedValue({
      product: sampleProduct,
      deleted: false
    });

    const response = await request(app)
      .post('/admin/products/1/delete')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({});

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toBe('/admin/products');

    expect(response.headers['set-cookie'].join(';'))
      .toContain('flash=');
  });

  test('Devuelve 404 si el producto no existe', async () => {
    productService.findById.mockResolvedValue(null);

    const response = await request(app)
      .get('/admin/products/999999/edit')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(404);

    expect(response.headers['content-type'])
      .toContain('text/html');
  });

  test('Devuelve 400 con un id mal formado', async () => {
    await request(app)
      .get('/admin/products/abc/edit')
      .set('Cookie', sessionCookie())
      .expect(400);
  });

  test('Impide crear productos sin permiso', async () => {
    await request(app)
      .post('/admin/products')
      .set('Cookie', sessionCookie(['products:read:any']))
      .type('form')
      .send(validForm)
      .expect(403);

    expect(productService.createProduct)
      .not.toHaveBeenCalled();
  });

  test('Renderiza la pagina en ingles', async () => {
    const response = await request(app)
      .get('/admin/products?lang=en')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('<html lang="en"');

    expect(response.text)
      .toContain('Product management');
  });

  test('Muestra un mensaje si no hay productos', async () => {
    productService.listAll.mockResolvedValue([]);

    const response = await request(app)
      .get('/admin/products?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Todavía no hay productos registrados.');
  });
});
