const request = require('supertest');
const app = require('../app');

const { Op } = require('sequelize');
const { Product } = require('../models/sql');

const productService = require('../services/product.service');

const sampleProduct = {
  id: 1,
  category_id: 1,
  name: 'Stride Runner X',
  brand: 'Stride & Co.',
  description: 'Producto de prueba',
  price: '1899.00',
  active: true
};

function mockCatalog(products = [sampleProduct], page = 1) {
  return jest.spyOn(productService, 'listActive')
    .mockResolvedValue({
      products,
      total: products.length,
      page,
      pageSize: 4,
      totalPages: 1
    });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('F2 - Inicio y catalogo SSR', () => {

  test('GET / muestra productos destacados en HTML', async () => {

    jest.spyOn(productService, 'featured')
      .mockResolvedValue([sampleProduct]);

    const response = await request(app)
      .get('/?lang=es');

    expect(response.status).toBe(200);

    expect(response.headers['content-type'])
      .toContain('text/html');

    expect(response.text)
      .toContain('Stride Runner X');

    expect(response.text)
      .toContain('Destacados');

  });

  test('GET /products responde HTML con productos', async () => {

    mockCatalog();

    const response = await request(app)
      .get('/products?lang=es');

    expect(response.status).toBe(200);

    expect(response.headers['content-type'])
      .toContain('text/html');

    expect(response.text)
      .toContain('Stride Runner X');

    expect(response.text)
      .toContain('Todos los productos');

    expect(response.text)
      .toContain('1,899.00');

  });

  test('Envia los filtros al servicio', async () => {

    const service = mockCatalog([], 2);

    await request(app)
      .get('/products?q=Runner&category=1&page=2')
      .expect(200);

    expect(service).toHaveBeenCalledWith({
      q: 'Runner',
      category: '1',
      page: 2,
      pageSize: 4
    });

  });

  test('Muestra una lista vacia', async () => {

    mockCatalog([]);

    const response = await request(app)
      .get('/products?lang=es&q=inexistente');

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('No se encontraron productos.');

  });

  test('Renderiza el catalogo en ingles', async () => {

    mockCatalog();

    const response = await request(app)
      .get('/products?lang=en');

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('All products');

  });

  test('Conserva el idioma mediante cookie', async () => {

    mockCatalog();

    const agent = request.agent(app);

    await agent.get('/products?lang=en')
      .expect(200);

    const response = await agent.get('/products');

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('All products');

  });

  test('Rechaza una pagina invalida', async () => {

    const service = mockCatalog();

    await request(app)
      .get('/products?page=-1')
      .expect(400);

    expect(service).not.toHaveBeenCalled();

  });

  test('La paginacion conserva los filtros', async () => {

    jest.spyOn(productService, 'listActive')
      .mockResolvedValue({
        products: [sampleProduct],
        total: 8,
        page: 1,
        pageSize: 4,
        totalPages: 2
      });

    const response = await request(app)
      .get('/products?q=Runner&category=1&lang=es');

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('q=Runner&amp;category=1&amp;page=2');

  });

  test('Escapa contenido HTML de los productos', async () => {

    mockCatalog([{
      ...sampleProduct,
      name: '<script>alert(1)</script>'
    }]);

    const response = await request(app)
      .get('/products');

    expect(response.status).toBe(200);

    expect(response.text)
      .not.toContain('<script>alert(1)</script>');

    expect(response.text)
      .toContain('&lt;script&gt;');

  });

});

describe('Servicio de productos', () => {

  test('Consulta solo productos activos y aplica filtros', async () => {

    const query = jest.spyOn(Product, 'findAndCountAll')
      .mockResolvedValue({
        rows: [sampleProduct],
        count: 8
      });

    const result = await productService.listActive({
      q: 'Runner',
      category: '1',
      page: 2,
      pageSize: 4
    });

    expect(query).toHaveBeenCalledWith({
      where: {
        active: true,
        category_id: 1,
        name: {
          [Op.iLike]: '%Runner%'
        }
      },
      limit: 4,
      offset: 4,
      order: [['id', 'ASC']]
    });

    expect(result.totalPages).toBe(2);

  });

});