const request = require('supertest');
const app = require('../app');

const productService = require('../services/product.service');

const sampleProduct = {
  id: 1,
  name: 'Stride Runner X',
  brand: 'Stride & Co.',
  category_id: 1,
  description: 'Ligereza y amortiguación para correr.',
  price: '1899.00',
  active: true,
  variants: [
    {
      id: 11,
      sku: 'RUN-X-BLK-26',
      size: '26',
      color: 'Negro',
      available: 18
    },
    {
      id: 12,
      sku: 'RUN-X-BLK-27',
      size: '27',
      color: 'Negro',
      available: 0
    }
  ]
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('F3 - Detalle de producto SSR', () => {

  test('Muestra el detalle de un producto activo', async () => {

    jest.spyOn(productService, 'findActiveById')
      .mockResolvedValue(sampleProduct);

    const response = await request(app)
      .get('/products/1?lang=es');

    expect(response.status).toBe(200);

    expect(response.headers['content-type'])
      .toContain('text/html');

    expect(response.text)
      .toContain('Stride Runner X');

    expect(response.text)
      .toContain('RUN-X-BLK-26');

    expect(response.text)
      .toContain('18');

  });

  test('Muestra las variantes disponibles y agotadas', async () => {

    jest.spyOn(productService, 'findActiveById')
      .mockResolvedValue(sampleProduct);

    const response = await request(app)
      .get('/products/1');

    expect(response.text)
      .toContain('RUN-X-BLK-26');

    expect(response.text)
      .toContain('RUN-X-BLK-27');

    expect(response.text)
      .toContain('Agotado');

  });

  test('Devuelve 404 cuando el producto no existe', async () => {

    jest.spyOn(productService, 'findActiveById')
      .mockResolvedValue(null);

    const response = await request(app)
      .get('/products/999999');

    expect(response.status).toBe(404);

    expect(response.headers['content-type'])
      .toContain('text/html');

  });

  test('Devuelve 404 cuando el producto esta inactivo', async () => {

    jest.spyOn(productService, 'findActiveById')
      .mockResolvedValue(null);

    const response = await request(app)
      .get('/products/2');

    expect(response.status).toBe(404);

  });

  test('Rechaza identificadores invalidos', async () => {

    const service = jest.spyOn(
      productService,
      'findActiveById'
    );

    const response = await request(app)
      .get('/products/abc');

    expect(response.status).toBe(404);

    expect(service).not.toHaveBeenCalled();

  });

  test('Muestra el detalle en ingles', async () => {

    jest.spyOn(productService, 'findActiveById')
      .mockResolvedValue(sampleProduct);

    const response = await request(app)
      .get('/products/1?lang=en');

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Back to catalog');

    expect(response.text)
      .toContain('Available sizes and colors');

  });

  test('Muestra mensaje cuando no hay variantes', async () => {

    jest.spyOn(productService, 'findActiveById')
      .mockResolvedValue({
        ...sampleProduct,
        variants: []
      });

    const response = await request(app)
      .get('/products/1');

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Este producto todavía no tiene variantes disponibles.');

  });

  test('Genera titulo y descripcion dinamicos', async () => {

    jest.spyOn(productService, 'findActiveById')
      .mockResolvedValue(sampleProduct);

    const response = await request(app)
      .get('/products/1');

    expect(response.text)
      .toContain('<title>Stride Runner X | Stride &amp; Co.</title>');

    expect(response.text)
      .toContain('name="description"');

  });

});