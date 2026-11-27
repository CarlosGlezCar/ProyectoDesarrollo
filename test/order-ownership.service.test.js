const orderService = require('../services/order.service');
const { Customer, Order } = require('../models/mongo');

afterEach(() => {
  jest.restoreAllMocks();
});

test('Consulta solamente pedidos de clientes propios', async () => {
  const customerId = '507f1f77bcf86cd799439011';

  jest.spyOn(Customer, 'find')
    .mockReturnValue({
      select: jest.fn().mockResolvedValue([
        { _id: customerId }
      ])
    });

  const populate = jest.fn().mockResolvedValue([
    {
      _id: 'pedido-propio',
      customerId,
      createdAt: '2026-11-25'
    }
  ]);

  jest.spyOn(Order, 'find')
    .mockReturnValue({ populate });

  const result = await orderService.listOwnOrders(1);

  expect(Customer.find)
    .toHaveBeenCalledWith({ userId: 1 });

  expect(Order.find)
    .toHaveBeenCalledWith({
      customerId: {
        $in: [customerId]
      }
    });

  expect(result).toHaveLength(1);
});

test('No consulta todos los pedidos si no tiene cliente', async () => {
  jest.spyOn(Customer, 'find')
    .mockReturnValue({
      select: jest.fn().mockResolvedValue([])
    });

  const find = jest.spyOn(Order, 'find');

  const result = await orderService.listOwnOrders(1);

  expect(result).toEqual([]);
  expect(find).not.toHaveBeenCalled();
});

test('El servicio rechaza un pedido ajeno', async () => {
  jest.spyOn(Order, 'findById')
    .mockResolvedValue({
      customerId: '507f1f77bcf86cd799439011'
    });

  jest.spyOn(Customer, 'findById')
    .mockResolvedValue({
      userId: 999
    });

  const result = await orderService.findOwnOrder(
    '507f1f77bcf86cd799439021',
    1
  );

  expect(result).toEqual({
    status: 403
  });
});