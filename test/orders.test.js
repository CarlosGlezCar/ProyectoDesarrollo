const request = require('supertest');
const app = require('../app');
const { Order, Customer } = require('../models/mongo');
const { User, Product } = require('../models/sql');
const { mockSession } = require('./helpers/session');
const { query } = require('./helpers/mongo');
const es = require('../locales/es.json');
const en = require('../locales/en.json');

const SALES_ID = 2;
const USER_ID = 3;
const SELLER_ID = 5;
const ORDER_ID = '507f1f77bcf86cd799439021';
const CUSTOMER_ID = '507f1f77bcf86cd799439011';
const STATUSES = Order.schema.path('statusHistory').schema.path('status').enumValues;

const validOrder = {
  customerId: CUSTOMER_ID,
  salesPersonId: SELLER_ID,
  paymentMethod: 'card',
  totals: { subtotal: '100.00', shipping: '0', discount: '0', total: '100.00' },
  shippingAddress: {
    street: 'Calle Falsa',
    number: '123',
    city: 'Chihuahua',
    state: 'Chihuahua',
    postalCode: '31000',
    country: 'México'
  },
  items: [{ productId: 1, quantity: 2, unitPrice: '50.00' }]
};

const ADMIN_PERMISSIONS = [
  'orders:create:any',
  'orders:read:any',
  'orders:update:any',
  'orders:delete:any'
];

const OWN_PERMISSIONS = ['orders:create:own', 'orders:read:own'];

function mockReferences({ customer = true, seller = true, products = 1 } = {}) {
  jest.spyOn(Customer, 'exists').mockResolvedValue(customer ? { _id: CUSTOMER_ID } : null);
  jest.spyOn(Product, 'count').mockResolvedValue(products);
  User.findByPk.mockImplementation(async id =>
    Number(id) === SELLER_ID && !seller
      ? null
      : { id: Number(id), role_id: 1, active: true }
  );
}

describe('Rutas de órdenes (con mocks)', () => {
  let auth;

  beforeEach(() => {
    auth = mockSession({ userId: SALES_ID, roleId: 2, permissions: ADMIN_PERMISSIONS });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/orders', () => {
    test('con permiso any responde 200 con todas las órdenes (sin filtro)', async () => {
      const find = jest.spyOn(Order, 'find').mockReturnValue(query([{ _id: ORDER_ID }]));

      const response = await request(app)
        .get('/api/orders')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.orders.list);
      expect(find).toHaveBeenCalledWith({});
    });

    test('responde en inglés con Accept-Language: en', async () => {
      jest.spyOn(Order, 'find').mockReturnValue(query([]));

      const response = await request(app)
        .get('/api/orders')
        .set('Accept-Language', 'en')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(en.orders.list);
    });

    test('responde 403 a un usuario que solo tiene orders:read:own (orders:read:any)', async () => {
      const own = mockSession({ userId: USER_ID, roleId: 3, permissions: OWN_PERMISSIONS });
      const find = jest.spyOn(Order, 'find');

      const response = await request(app)
        .get('/api/orders')
        .set('Accept-Language', 'es')
        .set(own);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
      expect(find).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/orders/own', () => {
    test('solo consulta las órdenes de los clientes del propio usuario', async () => {
      const own = mockSession({ userId: USER_ID, roleId: 3, permissions: OWN_PERMISSIONS });
      jest.spyOn(Customer, 'find').mockReturnValue(query([{ _id: CUSTOMER_ID }]));
      const find = jest.spyOn(Order, 'find').mockReturnValue(query([{ _id: ORDER_ID }]));

      const response = await request(app)
        .get('/api/orders/own')
        .set('Accept-Language', 'es')
        .set(own);

      expect(response.statusCode).toBe(200);
      expect(find).toHaveBeenCalledWith({ customerId: { $in: [CUSTOMER_ID] } });
    });

    test('responde 403 a un rol sin orders:read:own', async () => {
      const sinPermiso = mockSession({ userId: USER_ID, roleId: 3, permissions: ['products:read:any'] });

      const response = await request(app)
        .get('/api/orders/own')
        .set('Accept-Language', 'es')
        .set(sinPermiso);

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/orders/:id', () => {
    test('con permiso any responde 200 con la orden y su cliente', async () => {
      jest.spyOn(Order, 'findById').mockReturnValue(
        query({ _id: ORDER_ID, customerId: { email: 'cliente@strideco.test' } })
      );

      const response = await request(app)
        .get(`/api/orders/${ORDER_ID}`)
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.orders.found);
      expect(response.body.data.customerId.email).toBe('cliente@strideco.test');
    });

    test('responde 404 si la orden no existe', async () => {
      jest.spyOn(Order, 'findById').mockReturnValue(query(null));

      const response = await request(app)
        .get(`/api/orders/${ORDER_ID}`)
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.orders.notFound);
      expect(response.body.data).toBeNull();
    });

    test('responde 400 con un id mal formado', async () => {
      const response = await request(app)
        .get('/api/orders/abc')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.invalidId);
    });

    test('con permiso own responde 200 si la orden es del usuario', async () => {
      const own = mockSession({ userId: USER_ID, roleId: 3, permissions: OWN_PERMISSIONS });
      jest.spyOn(Order, 'findById').mockReturnValue(
        query({ _id: ORDER_ID, customerId: CUSTOMER_ID })
      );
      jest.spyOn(Customer, 'findById').mockReturnValue(
        query({ _id: CUSTOMER_ID, userId: USER_ID })
      );

      const response = await request(app)
        .get(`/api/orders/${ORDER_ID}`)
        .set('Accept-Language', 'es')
        .set(own);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.orders.found);
    });

    test('con permiso own responde 403 si la orden es de otro usuario', async () => {
      const own = mockSession({ userId: USER_ID, roleId: 3, permissions: OWN_PERMISSIONS });
      jest.spyOn(Order, 'findById').mockReturnValue(
        query({ _id: ORDER_ID, customerId: CUSTOMER_ID })
      );
      jest.spyOn(Customer, 'findById').mockReturnValue(
        query({ _id: CUSTOMER_ID, userId: 99 })
      );

      const response = await request(app)
        .get(`/api/orders/${ORDER_ID}`)
        .set('Accept-Language', 'es')
        .set(own);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
    });

    test('con permiso own responde 404 si la orden no existe', async () => {
      const own = mockSession({ userId: USER_ID, roleId: 3, permissions: OWN_PERMISSIONS });
      jest.spyOn(Order, 'findById').mockReturnValue(query(null));

      const response = await request(app)
        .get(`/api/orders/${ORDER_ID}`)
        .set('Accept-Language', 'es')
        .set(own);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.common.notFound);
    });
  });

  describe('POST /api/orders', () => {
    test('responde 201 y registra el estado inicial pending con quien creó la orden', async () => {
      mockReferences();
      const populate = jest.fn().mockResolvedValue();
      const create = jest.spyOn(Order, 'create').mockResolvedValue({ _id: ORDER_ID, populate });

      const response = await request(app)
        .post('/api/orders')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(validOrder);

      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe(es.orders.created);
      const guardado = create.mock.calls[0][0];
      expect(guardado.customerId).toBe(CUSTOMER_ID);
      expect(guardado.statusHistory).toEqual([
        { status: 'pending', changedById: SALES_ID }
      ]);
      expect(populate).toHaveBeenCalledWith('customerId');
    });

    test('con permiso own responde 201 si el cliente es del usuario', async () => {
      const own = mockSession({ userId: USER_ID, roleId: 3, permissions: OWN_PERMISSIONS });
      mockReferences();
      jest.spyOn(Customer, 'findById').mockReturnValue(query({ _id: CUSTOMER_ID, userId: USER_ID }));
      jest.spyOn(Order, 'create').mockResolvedValue({ _id: ORDER_ID, populate: jest.fn() });

      const response = await request(app)
        .post('/api/orders')
        .set('Accept-Language', 'es')
        .set(own)
        .send(validOrder);

      expect(response.statusCode).toBe(201);
    });

    test('con permiso own responde 403 si el cliente es de otro usuario', async () => {
      const own = mockSession({ userId: USER_ID, roleId: 3, permissions: OWN_PERMISSIONS });
      jest.spyOn(Customer, 'findById').mockReturnValue(query({ _id: CUSTOMER_ID, userId: 99 }));
      const create = jest.spyOn(Order, 'create');

      const response = await request(app)
        .post('/api/orders')
        .set('Accept-Language', 'es')
        .set(own)
        .send(validOrder);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
      expect(create).not.toHaveBeenCalled();
    });

    test('responde 404 si el cliente no existe', async () => {
      mockReferences({ customer: false });
      const create = jest.spyOn(Order, 'create');

      const response = await request(app)
        .post('/api/orders')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(validOrder);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.orders.customerNotFound);
      expect(create).not.toHaveBeenCalled();
    });

    test('responde 404 si el vendedor no existe', async () => {
      mockReferences({ seller: false });
      const create = jest.spyOn(Order, 'create');

      const response = await request(app)
        .post('/api/orders')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(validOrder);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.users.notFound);
      expect(create).not.toHaveBeenCalled();
    });

    test('responde 404 si algún producto no existe', async () => {
      mockReferences({ products: 0 });
      const create = jest.spyOn(Order, 'create');

      const response = await request(app)
        .post('/api/orders')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(validOrder);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.products.notFound);
      expect(create).not.toHaveBeenCalled();
    });

    test('responde 400 si la orden no trae productos', async () => {
      mockReferences();
      const create = jest.spyOn(Order, 'create');

      const response = await request(app)
        .post('/api/orders')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ ...validOrder, items: [] });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.orders.emptyItems);
      expect(create).not.toHaveBeenCalled();
    });

    test('responde 400 si el customerId está mal formado', async () => {
      mockReferences();
      const create = jest.spyOn(Order, 'create');

      const response = await request(app)
        .post('/api/orders')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ ...validOrder, customerId: 'abc' });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.invalidId);
      expect(create).not.toHaveBeenCalled();
    });

    test.each([
      ['sin body', undefined],
      ['sin customerId', { ...validOrder, customerId: undefined }],
      ['sin items', { ...validOrder, items: undefined }],
      ['sin totals', { ...validOrder, totals: undefined }],
      ['con salesPersonId inválido', { ...validOrder, salesPersonId: 'abc' }],
      ['con un producto sin productId válido', { ...validOrder, items: [{ productId: 'abc' }] }],
      ['con un campo no permitido', { ...validOrder, status: 'delivered' }]
    ])('responde 400 %s y no llama a la base', async (_caso, body) => {
      mockReferences();
      const create = jest.spyOn(Order, 'create');

      const response = await request(app)
        .post('/api/orders')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(body);

      expect(response.statusCode).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/orders/:id', () => {
    function orderDocument() {
      return {
        _id: ORDER_ID,
        statusHistory: [{ status: 'pending' }],
        save: jest.fn().mockResolvedValue(),
        populate: jest.fn().mockResolvedValue()
      };
    }

    test('responde 200 y agrega el cambio de estado al historial', async () => {
      const order = orderDocument();
      jest.spyOn(Order, 'findById').mockReturnValue(query(order));
      const nuevoEstado = STATUSES.find(status => status !== 'pending');

      const response = await request(app)
        .put(`/api/orders/${ORDER_ID}`)
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ status: nuevoEstado, note: 'Enviado por paquetería' });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.orders.updated);
      expect(order.statusHistory).toHaveLength(2);
      expect(order.statusHistory[1]).toMatchObject({
        status: nuevoEstado,
        changedById: SALES_ID,
        note: 'Enviado por paquetería'
      });
      expect(order.save).toHaveBeenCalledTimes(1);
    });

    test('responde 400 con un estado inválido y no consulta la orden', async () => {
      const find = jest.spyOn(Order, 'findById');

      const response = await request(app)
        .put(`/api/orders/${ORDER_ID}`)
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ status: 'inventado' });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.orders.invalidStatus);
      expect(find).not.toHaveBeenCalled();
    });

    test('responde 400 si manda una nota sin estado', async () => {
      const response = await request(app)
        .put(`/api/orders/${ORDER_ID}`)
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ note: 'Solo una nota' });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.invalidData);
    });

    test('responde 404 si la orden no existe', async () => {
      jest.spyOn(Order, 'findById').mockReturnValue(query(null));

      const response = await request(app)
        .put(`/api/orders/${ORDER_ID}`)
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ paymentMethod: 'cash' });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.orders.notFound);
    });

    test('responde 403 a un usuario con solo permisos own', async () => {
      const own = mockSession({ userId: USER_ID, roleId: 3, permissions: OWN_PERMISSIONS });
      jest.spyOn(Order, 'findById').mockReturnValue(query({ _id: ORDER_ID, customerId: CUSTOMER_ID }));
      jest.spyOn(Customer, 'findById').mockReturnValue(query({ _id: CUSTOMER_ID, userId: USER_ID }));

      const response = await request(app)
        .put(`/api/orders/${ORDER_ID}`)
        .set('Accept-Language', 'es')
        .set(own)
        .send({ paymentMethod: 'cash' });

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
    });
  });

  describe('DELETE /api/orders/:id', () => {
    test('responde 200 y elimina la orden', async () => {
      const remove = jest
        .spyOn(Order, 'findByIdAndDelete')
        .mockResolvedValue({ _id: ORDER_ID });

      const response = await request(app)
        .delete(`/api/orders/${ORDER_ID}`)
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.orders.deleted);
      expect(remove).toHaveBeenCalledWith(ORDER_ID);
    });

    test('responde 404 si no existe', async () => {
      jest.spyOn(Order, 'findByIdAndDelete').mockResolvedValue(null);

      const response = await request(app)
        .delete(`/api/orders/${ORDER_ID}`)
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.orders.notFound);
    });

    test('responde 403 a un rol sin permiso de borrar', async () => {
      const own = mockSession({ userId: USER_ID, roleId: 3, permissions: OWN_PERMISSIONS });
      const remove = jest.spyOn(Order, 'findByIdAndDelete');

      const response = await request(app)
        .delete(`/api/orders/${ORDER_ID}`)
        .set('Accept-Language', 'es')
        .set(own);

      expect(response.statusCode).toBe(403);
      expect(remove).not.toHaveBeenCalled();
    });
  });
});