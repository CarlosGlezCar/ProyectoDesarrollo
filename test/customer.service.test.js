const customerService = require(
  '../services/customer.service'
);

const orderService = require('../services/order.service');

const { Customer } = require('../models/mongo');

const customerId = '507f1f77bcf86cd799439011';

afterEach(() => {
  jest.restoreAllMocks();
});

test('Ordena los clientes por correo', async () => {
  jest.spyOn(Customer, 'find')
    .mockResolvedValue([
      { email: 'z@example.com' },
      { email: 'a@example.com' }
    ]);

  const result =
    await customerService.listAdminCustomers();

  expect(result[0].email)
    .toBe('a@example.com');

  expect(result[1].email)
    .toBe('z@example.com');
});

test('Consulta solamente pedidos del cliente seleccionado', async () => {
  const customer = {
    _id: customerId,
    email: 'cliente@example.com'
  };

  jest.spyOn(Customer, 'findById')
    .mockResolvedValue(customer);

  jest.spyOn(orderService, 'listOrders')
    .mockResolvedValue([
      { _id: 'pedido-1' }
    ]);

  const result =
    await customerService.findCustomerDetail(customerId);

  expect(Customer.findById)
    .toHaveBeenCalledWith(customerId);

  expect(orderService.listOrders)
    .toHaveBeenCalledWith({
      customerId
    });

  expect(result.customer)
    .toEqual(customer);

  expect(result.orders)
    .toHaveLength(1);
});

test('No consulta pedidos si el cliente no existe', async () => {
  jest.spyOn(Customer, 'findById')
    .mockResolvedValue(null);

  const list = jest.spyOn(orderService, 'listOrders');

  const result =
    await customerService.findCustomerDetail(customerId);

  expect(result).toBeNull();

  expect(list).not.toHaveBeenCalled();
});