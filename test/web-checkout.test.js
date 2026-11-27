
const request = require('supertest');
const app = require('../app');

const cartService = require('../services/cart.service');
const checkoutService = require('../services/checkout.service');
const orderService = require('../services/order.service');

const { Order, Customer } = require('../models/mongo');
const { mockSession } = require('./helpers/session');

const orderId = '507f1f77bcf86cd799439021';

const permissions = [
  'orders:create:own',
  'orders:read:own'
];

const items = [
  {
    variantId: 1,
    quantity: 2
  }
];

const validForm = {
  orderId,
  street: 'Calle de prueba',
  number: '100',
  city: 'Chihuahua',
  state: 'Chihuahua',
  postalCode: '31000',
  country: 'Mexico',
  paymentMethod: 'cash'
};

const sampleCart = {
  lines: [
    {
      variantId: 1,
      productId: 1,
      name: 'Tenis deportivos Stride',
      sku: 'STRIDE-001-25',
      size: '25',
      color: 'Negro',
      quantity: 2,
      available: 20,
      valid: true,
      unitPriceCents: 100000,
      subtotalCents: 200000
    }
  ],
  count: 2,
  subtotalCents: 200000,
  shippingCents: 0,
  totalCents: 200000,
  canCheckout: true
};

const sampleOrder = {
  _id: orderId,
  channel: 'web',
  customerId: '507f1f77bcf86cd799439011',
  paymentMethod: 'cash',

  items: [{
    productId: 1,
    variantId: 1,
    name: 'Tenis deportivos Stride',
    sku: 'STRIDE-001-25',
    quantity: 2,
    unitPrice: '1000.00'
  }],

  totals: {
    total: '2000.00'
  },

  shippingAddress: {
    street: 'Calle de prueba',
    number: '100',
    city: 'Chihuahua',
    state: 'Chihuahua',
    postalCode: '31000',
    country: 'Mexico'
  }
};

function cookies(
  grantedPermissions = permissions,
  cartItems = items
) {
  const headers = mockSession({
    userId: 1,
    permissions: grantedPermissions
  });

  const token = headers.Authorization.replace(
    /^Bearer\s+/i,
    ''
  );

  return [
    `access_token=${token}`,
    `cart=${encodeURIComponent(JSON.stringify(cartItems))}`,
    `checkout_attempt=${encodeURIComponent('1:' + orderId)}`
  ].join('; ');
}

beforeEach(() => {
  jest.spyOn(cartService, 'getCart')
    .mockResolvedValue(sampleCart);

  jest.spyOn(checkoutService, 'getPendingAttempt')
    .mockResolvedValue(null);

  jest.spyOn(checkoutService, 'getOwnAttempt')
    .mockResolvedValue(null);

  jest.spyOn(checkoutService, 'placeOrder')
    .mockResolvedValue(sampleOrder);

  jest.spyOn(orderService, 'findOwnOrder')
    .mockResolvedValue({ order: sampleOrder });

  jest.spyOn(Order, 'findById')
    .mockResolvedValue(sampleOrder);

  jest.spyOn(Customer, 'findById')
    .mockResolvedValue({ userId: 1 });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('F5 - Checkout SSR', () => {

  test('Redirige al login sin sesion', async () => {
    const response = await request(app)
      .get('/checkout');

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toContain('/login');
  });

  test('Muestra el checkout en HTML', async () => {
    const response = await request(app)
      .get('/checkout?lang=es')
      .set('Cookie', cookies());

    expect(response.status).toBe(200);

    expect(response.headers['content-type'])
      .toContain('text/html');

    expect(response.text)
      .toContain('Finalizar compra');

    expect(response.text)
      .toContain('Tenis deportivos Stride');
  });

  test('Redirige a la bolsa si esta vacia', async () => {
    const response = await request(app)
      .get('/checkout')
      .set('Cookie', cookies(permissions, []));

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toBe('/cart');
  });

  test('Rechaza usuarios sin permisos de compra', async () => {
    await request(app)
      .get('/checkout')
      .set('Cookie', cookies([]))
      .expect(403);
  });

  test('Confirma la compra mediante PRG', async () => {
    const response = await request(app)
      .post('/checkout')
      .set('Cookie', cookies())
      .type('form')
      .send(validForm);

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toBe('/my/orders/' + orderId + '/confirmation');

    expect(checkoutService.placeOrder)
      .toHaveBeenCalledWith({
        orderId,
        userId: 1,
        items,
        address: {
          street: 'Calle de prueba',
          number: '100',
          city: 'Chihuahua',
          state: 'Chihuahua',
          postalCode: '31000',
          country: 'Mexico'
        },
        paymentMethod: 'cash'
      });

    expect(response.headers['set-cookie'].join(';'))
      .toContain('cart=;');
  });

  test('Rechaza una direccion incompleta', async () => {
    const response = await request(app)
      .post('/checkout?lang=es')
      .set('Cookie', cookies())
      .type('form')
      .send({
        ...validForm,
        street: ''
      });

    expect(response.status).toBe(400);

    expect(response.text)
      .toContain('Completa este campo');

    expect(response.text)
      .toContain('Chihuahua');

    expect(checkoutService.placeOrder)
      .not.toHaveBeenCalled();
  });

  test('Rechaza un metodo de pago invalido', async () => {
    await request(app)
      .post('/checkout')
      .set('Cookie', cookies())
      .type('form')
      .send({
        ...validForm,
        paymentMethod: 'invalid'
      })
      .expect(400);

    expect(checkoutService.placeOrder)
      .not.toHaveBeenCalled();
  });

  test('Rechaza existencias insuficientes', async () => {
    checkoutService.placeOrder.mockRejectedValue(
      new checkoutService.CheckoutError(
        400,
        'ssr.checkout.insufficientStock'
      )
    );

    const response = await request(app)
      .post('/checkout?lang=es')
      .set('Cookie', cookies())
      .type('form')
      .send(validForm);

    expect(response.status).toBe(400);

    expect(response.text)
      .toContain('No hay suficientes existencias');
  });

  test('Permite reintentar una compra pendiente', async () => {
    checkoutService.getOwnAttempt.mockResolvedValue({
      order_id: orderId,
      user_id: 1,
      status: 'pending'
    });

    const response = await request(app)
      .post('/checkout')
      .set('Cookie', cookies(permissions, []))
      .type('form')
      .send({ orderId });

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toContain('/confirmation');

    expect(checkoutService.placeOrder)
      .toHaveBeenCalledTimes(1);
  });

  test('Muestra una compra pendiente para reintentar', async () => {
    checkoutService.getPendingAttempt.mockResolvedValue({
      order_id: orderId,
      user_id: 1,
      status: 'pending'
    });

    const response = await request(app)
      .get('/checkout?lang=es')
      .set('Cookie', cookies());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Reintentar confirmación');
  });

  test('Muestra la confirmacion del pedido propio', async () => {
    const response = await request(app)
      .get('/my/orders/' + orderId + '/confirmation?lang=es')
      .set('Cookie', cookies());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain(orderId);

    expect(response.text)
      .toContain('Pedido registrado');

    expect(response.text)
      .not.toContain('password_hash');

    expect(response.text)
      .not.toContain('salt_key');
  });

  test('Impide consultar pedidos de otros usuarios', async () => {
    Customer.findById.mockResolvedValue({
      userId: 999
    });

    await request(app)
      .get('/my/orders/' + orderId + '/confirmation')
      .set('Cookie', cookies())
      .expect(403);

    expect(orderService.findOwnOrder)
      .not.toHaveBeenCalled();
  });

  test('Renderiza el checkout en ingles', async () => {
    const response = await request(app)
      .get('/checkout?lang=en')
      .set('Cookie', cookies());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Shipping address');

    expect(response.text)
      .toContain('Place order');
  });

});