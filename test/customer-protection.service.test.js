const customerService = require('../services/customer.service');
const { Customer, Order } = require('../models/mongo');

const id = '507f1f77bcf86cd799439011';

afterEach(() => {
  jest.restoreAllMocks();
});

test('Rechaza cambiar el propietario de un cliente', async () => {
  const save = jest.fn();
  const set = jest.fn();
  jest.spyOn(Customer, 'findById').mockResolvedValue({
    _id: id, userId: 2, save, set
  });

  expect(await customerService.updateCustomer(id, { userId: 3 }))
    .toEqual({ error: { status: 409, key: 'customers.ownerProtected' } });
  expect(set).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
});

test('Rechaza eliminar un cliente con pedidos', async () => {
  const exists = jest.spyOn(Order, 'exists').mockResolvedValue({ _id: id });
  const remove = jest.spyOn(Customer, 'findByIdAndDelete');

  expect(await customerService.deleteCustomer(id))
    .toEqual({ error: { status: 409, key: 'customers.hasOrders' } });
  expect(exists).toHaveBeenCalledWith({ customerId: id });
  expect(remove).not.toHaveBeenCalled();
});

test('Permite eliminar un cliente sin pedidos', async () => {
  jest.spyOn(Order, 'exists').mockResolvedValue(null);
  const remove = jest.spyOn(Customer, 'findByIdAndDelete')
    .mockResolvedValue({ _id: id });

  expect(await customerService.deleteCustomer(id))
    .toEqual({ customer: { _id: id } });
  expect(remove).toHaveBeenCalledWith(id);
});
