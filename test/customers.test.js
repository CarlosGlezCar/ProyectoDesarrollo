const request = require('supertest');
const app = require('../app');
const { Customer } = require('../models/mongo');
const { User } = require('../models/sql');
const { mockSession } = require('./helpers/session');
const { query } = require('./helpers/mongo');
const es = require('../locales/es.json');
const en = require('../locales/en.json');

const ADMIN_ID = 1;
const USER_ID = 3;
const CUSTOMER_ID = '507f1f77bcf86cd799439011';

const validCustomer = {
  userId: 2,
  email: 'cliente@strideco.test',
  phone: '6141234567',
  addresses: [
    {
      type: 'shipping',
      street: 'Calle Falsa',
      number: '123',
      city: 'Chihuahua',
      state: 'Chihuahua',
      postalCode: '31000',
      country: 'México'
    }
  ]
};

const ADMIN_PERMISSIONS = [
  'customers:create:any',
  'customers:read:any',
  'customers:update:any',
  'customers:delete:any'
];

function mockUsers(sessionId, found) {
  User.findByPk.mockImplementation(async id =>
    Number(id) === sessionId
      ? { id: sessionId, role_id: 1, active: true }
      : found
  );
}

describe('Rutas de clientes (con mocks)', () => {
  let auth;

  beforeEach(() => {
    auth = mockSession({ userId: ADMIN_ID, permissions: ADMIN_PERMISSIONS });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/customers', () => {
    test('con permiso any responde 200 con todos los clientes (sin filtro)', async () => {
      const find = jest.spyOn(Customer, 'find').mockReturnValue(query([{ _id: CUSTOMER_ID }]));

      const response = await request(app)
        .get('/api/customers')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.customers.list);
      expect(find).toHaveBeenCalledWith({});
    });

    test('con permiso own solo consulta los clientes del propio usuario', async () => {
      const own = mockSession({ userId: USER_ID, roleId: 3, permissions: ['customers:read:own'] });
      const find = jest.spyOn(Customer, 'find').mockReturnValue(query([]));

      const response = await request(app)
        .get('/api/customers')
        .set('Accept-Language', 'es')
        .set(own);

      expect(response.statusCode).toBe(200);
      expect(find).toHaveBeenCalledWith({ userId: USER_ID });
    });

    test('responde en inglés con Accept-Language: en', async () => {
      jest.spyOn(Customer, 'find').mockReturnValue(query([]));

      const response = await request(app)
        .get('/api/customers')
        .set('Accept-Language', 'en')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(en.customers.list);
    });
  });

  describe('GET /api/customers/:id', () => {
    test('responde 200 con el cliente', async () => {
      jest.spyOn(Customer, 'findById').mockReturnValue(query({ _id: CUSTOMER_ID, email: 'a@b.test' }));

      const response = await request(app)
        .get(`/api/customers/${CUSTOMER_ID}`)
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.customers.found);
      expect(response.body.data.email).toBe('a@b.test');
    });

    test('responde 404 si no existe', async () => {
      jest.spyOn(Customer, 'findById').mockReturnValue(query(null));

      const response = await request(app)
        .get(`/api/customers/${CUSTOMER_ID}`)
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.customers.notFound);
      expect(response.body.data).toBeNull();
    });

    test('responde 400 con un id mal formado', async () => {
      const response = await request(app)
        .get('/api/customers/abc')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.invalidId);
    });

    test('con permiso own responde 200 si el cliente es del usuario', async () => {
      const own = mockSession({ userId: USER_ID, roleId: 3, permissions: ['customers:read:own'] });
      jest.spyOn(Customer, 'findById').mockReturnValue(
        query({ _id: CUSTOMER_ID, userId: USER_ID, email: 'a@b.test' })
      );

      const response = await request(app)
        .get(`/api/customers/${CUSTOMER_ID}`)
        .set('Accept-Language', 'es')
        .set(own);

      expect(response.statusCode).toBe(200);
    });

    test('con permiso own responde 403 si el cliente es de otro usuario', async () => {
      const own = mockSession({ userId: USER_ID, roleId: 3, permissions: ['customers:read:own'] });
      jest.spyOn(Customer, 'findById').mockReturnValue(
        query({ _id: CUSTOMER_ID, userId: 99, email: 'otro@b.test' })
      );

      const response = await request(app)
        .get(`/api/customers/${CUSTOMER_ID}`)
        .set('Accept-Language', 'es')
        .set(own);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
    });
  });

  describe('POST /api/customers', () => {
    test('responde 201 y guarda el correo normalizado (minúsculas, sin espacios)', async () => {
      jest.spyOn(Customer, 'findOne').mockResolvedValue(null);
      const create = jest.spyOn(Customer, 'create').mockResolvedValue({ _id: CUSTOMER_ID });

      const response = await request(app)
        .post('/api/customers')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ ...validCustomer, email: '  CLIENTE@Strideco.TEST ' });

      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe(es.customers.created);
      expect(create.mock.calls[0][0].email).toBe('cliente@strideco.test');
      expect(create.mock.calls[0][0].userId).toBe(2);
    });

    test('responde 404 si el usuario del cliente no existe', async () => {
      mockUsers(ADMIN_ID, null);
      const create = jest.spyOn(Customer, 'create');

      const response = await request(app)
        .post('/api/customers')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(validCustomer);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.users.notFound);
      expect(create).not.toHaveBeenCalled();
    });

    test('responde 400 si el usuario ya tiene un cliente', async () => {
      jest.spyOn(Customer, 'findOne').mockResolvedValueOnce({ _id: 'otro' });
      const create = jest.spyOn(Customer, 'create');

      const response = await request(app)
        .post('/api/customers')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(validCustomer);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.duplicate);
      expect(create).not.toHaveBeenCalled();
    });

    test('responde 400 si el correo ya está registrado', async () => {
      jest.spyOn(Customer, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ _id: 'otro' });
      const create = jest.spyOn(Customer, 'create');

      const response = await request(app)
        .post('/api/customers')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(validCustomer);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.customers.emailExists);
      expect(create).not.toHaveBeenCalled();
    });

    test.each([
      ['sin body', undefined],
      ['sin email', { ...validCustomer, email: undefined }],
      ['sin userId', { ...validCustomer, userId: undefined }],
      ['con email que no es texto', { ...validCustomer, email: 5 }],
      ['con userId mal formado', { ...validCustomer, userId: 'abc' }],
      ['con un campo no permitido', { ...validCustomer, isAdmin: true }]
    ])('responde 400 %s y no llama a la base', async (_caso, body) => {
      const create = jest.spyOn(Customer, 'create');

      const response = await request(app)
        .post('/api/customers')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(body);

      expect(response.statusCode).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/customers/:id', () => {
    test('responde 200 y actualiza el cliente', async () => {
      const set = jest.fn();
      const save = jest.fn().mockResolvedValue();
      jest.spyOn(Customer, 'findById').mockReturnValue(query({ _id: CUSTOMER_ID, set, save }));
      jest.spyOn(Customer, 'findOne').mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/customers/${CUSTOMER_ID}`)
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ phone: '6149999999' });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.customers.updated);
      expect(set).toHaveBeenCalledWith({ phone: '6149999999' });
      expect(save).toHaveBeenCalledTimes(1);
    });

    test('responde 400 si el nuevo correo ya lo usa otro cliente', async () => {
      const save = jest.fn();
      jest.spyOn(Customer, 'findById').mockReturnValue(query({ _id: CUSTOMER_ID, set: jest.fn(), save }));
      jest.spyOn(Customer, 'findOne').mockResolvedValue({ _id: 'otro' });

      const response = await request(app)
        .put(`/api/customers/${CUSTOMER_ID}`)
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ email: 'repetido@strideco.test' });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.customers.emailExists);
      expect(save).not.toHaveBeenCalled();
    });

    test('responde 404 si no existe', async () => {
      jest.spyOn(Customer, 'findById').mockReturnValue(query(null));

      const response = await request(app)
        .put(`/api/customers/${CUSTOMER_ID}`)
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ phone: '6149999999' });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.customers.notFound);
    });

    test('responde 400 con un id mal formado', async () => {
      const response = await request(app)
        .put('/api/customers/abc')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ phone: '6149999999' });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.invalidId);
    });
  });

  describe('DELETE /api/customers/:id', () => {
    test('responde 200 y elimina el cliente', async () => {
      const remove = jest
        .spyOn(Customer, 'findByIdAndDelete')
        .mockResolvedValue({ _id: CUSTOMER_ID });

      const response = await request(app)
        .delete(`/api/customers/${CUSTOMER_ID}`)
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.customers.deleted);
      expect(remove).toHaveBeenCalledWith(CUSTOMER_ID);
    });

    test('responde 404 si no existe', async () => {
      jest.spyOn(Customer, 'findByIdAndDelete').mockResolvedValue(null);

      const response = await request(app)
        .delete(`/api/customers/${CUSTOMER_ID}`)
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.customers.notFound);
    });
  });

  describe('Permisos', () => {
    test.each([
      ['post', '/api/customers'],
      ['put', `/api/customers/${CUSTOMER_ID}`],
      ['delete', `/api/customers/${CUSTOMER_ID}`]
    ])('%s %s responde 403 a un rol que solo tiene permisos own', async (metodo, ruta) => {
      const soloOwn = mockSession({
        userId: USER_ID,
        roleId: 3,
        permissions: ['customers:read:own', 'orders:read:own']
      });
      const create = jest.spyOn(Customer, 'create');
      const remove = jest.spyOn(Customer, 'findByIdAndDelete');

      const response = await request(app)
        [metodo](ruta)
        .set('Accept-Language', 'es')
        .set(soloOwn)
        .send(metodo === 'post' ? validCustomer : undefined);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
      expect(create).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    });

    test('un rol sin permisos sobre customers recibe 403 al consultar', async () => {
      const sinPermiso = mockSession({ roleId: 2, permissions: ['products:read:any'] });
      const find = jest.spyOn(Customer, 'find');

      const response = await request(app)
        .get('/api/customers')
        .set('Accept-Language', 'es')
        .set(sinPermiso);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
      expect(find).not.toHaveBeenCalled();
    });
  });
});