
const request = require('supertest');
const app = require('../app');

const variantService = require('../services/variant.service');

const variant = {
  id: 1,
  product_id: 1,
  sku: 'STRIDE-001-25',
  size: '25',
  color: 'Negro',
  active: true,
  product: {
    id: 1,
    name: 'Tenis deportivos Stride',
    price: '1000.00',
    active: true
  },
  inventory: {
    stock: 20,
    reserved: 5
  }
};

function cartCookie(items) {
  return 'cart=' + encodeURIComponent(
    JSON.stringify(items)
  );
}

beforeEach(() => {
  jest.spyOn(variantService, 'findById')
    .mockResolvedValue(variant);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('F4 - Bolsa de compra SSR', () => {

  test('Muestra la bolsa vacia', async () => {
    const response = await request(app)
      .get('/cart?lang=es');

    expect(response.status).toBe(200);

    expect(response.headers['content-type'])
      .toContain('text/html');

    expect(response.text)
      .toContain('Tu bolsa está vacía.');
  });

  test('Agrega productos y conserva la cookie', async () => {
    const agent = request.agent(app);

    const response = await agent
      .post('/cart/items')
      .type('form')
      .send({
        variantId: '1',
        quantity: '2'
      });

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toBe('/cart');

    expect(response.headers['set-cookie'].join(';'))
      .toContain('cart=');

    const page = await agent.get('/cart');

    expect(page.status).toBe(200);

    expect(page.text)
      .toContain('Tenis deportivos Stride');

    expect(page.text)
      .toContain('STRIDE-001-25');

    expect(page.text)
      .toContain('2,000.00');
  });

  test('Acumula la cantidad de una variante', async () => {
    const agent = request.agent(app);

    await agent.post('/cart/items')
      .type('form')
      .send({
        variantId: '1',
        quantity: '2'
      })
      .expect(302);

    await agent.post('/cart/items')
      .type('form')
      .send({
        variantId: '1',
        quantity: '3'
      })
      .expect(302);

    const response = await agent.get('/cart');

    expect(response.text)
      .toContain('5,000.00');
  });

  test('Actualiza la cantidad', async () => {
    await request(app)
      .post('/cart/items/1')
      .set('Cookie', cartCookie([
        { variantId: 1, quantity: 2 }
      ]))
      .type('form')
      .send({ quantity: '4' })
      .expect(302);
  });

  test('Rechaza cantidades superiores al stock disponible', async () => {
    const response = await request(app)
      .post('/cart/items?lang=es')
      .type('form')
      .send({
        variantId: '1',
        quantity: '16'
      });

    expect(response.status).toBe(400);

    expect(response.text)
      .toContain('No hay suficientes unidades disponibles.');
  });

  test.each([
    '0', '-1', '1.5', 'abc', '', '100'
  ])('Rechaza cantidad invalida: %s', async quantity => {

    await request(app)
      .post('/cart/items')
      .type('form')
      .send({
        variantId: '1',
        quantity
      })
      .expect(400);

  });

  test('Ignora precios manipulados por el navegador', async () => {
    const response = await request(app)
      .get('/cart')
      .set('Cookie', cartCookie([
        {
          variantId: 1,
          quantity: 2,
          price: 1
        }
      ]));

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('2,000.00');
  });

  test('Elimina un articulo', async () => {
    await request(app)
      .post('/cart/items/1/delete')
      .set('Cookie', cartCookie([
        { variantId: 1, quantity: 2 }
      ]))
      .type('form')
      .expect(302);
  });

  test('Devuelve 404 al actualizar un articulo inexistente', async () => {
    await request(app)
      .post('/cart/items/999')
      .type('form')
      .send({ quantity: '2' })
      .expect(404);
  });

  test('Rechaza variantes inactivas', async () => {
    variantService.findById.mockResolvedValue({
      ...variant,
      active: false
    });

    await request(app)
      .post('/cart/items')
      .type('form')
      .send({
        variantId: '1',
        quantity: '1'
      })
      .expect(400);
  });

  test('Ignora una cookie con JSON invalido', async () => {
    const response = await request(app)
      .get('/cart?lang=es')
      .set('Cookie', 'cart=invalid-json');

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Tu bolsa está vacía.');
  });

  test('Renderiza la bolsa en ingles', async () => {
    const response = await request(app)
      .get('/cart?lang=en');

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Shopping bag');

    expect(response.text)
      .toContain('Your bag is empty.');
  });

  test('No muestra informacion sensible', async () => {
    const response = await request(app)
      .get('/cart')
      .set('Cookie', cartCookie([
        { variantId: 1, quantity: 2 }
      ]));

    expect(response.status).toBe(200);

    expect(response.text)
      .not.toContain('password_hash');

    expect(response.text)
      .not.toContain('salt_key');
  });

});