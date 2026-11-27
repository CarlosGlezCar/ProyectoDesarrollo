
const orderService = require('../services/order.service');
const { Order } = require('../models/mongo');

const orderId = '507f1f77bcf86cd799439021';

const sampleOrder = {
  _id: orderId,
  statusHistory: [{
    status: 'pending',
    changedById: 3
  }]
};

afterEach(() => {
  jest.restoreAllMocks();
});

test('Agrega una entrada sin sobrescribir el historial', async () => {
  jest.spyOn(Order, 'findById')
    .mockResolvedValue(sampleOrder);

  const update = jest.spyOn(Order, 'findOneAndUpdate')
    .mockResolvedValue({
      ...sampleOrder,
      statusHistory: [
        ...sampleOrder.statusHistory,
        { status: 'paid' }
      ]
    });

  await orderService.changeOrderStatus(orderId, {
    status: 'paid',
    changedById: 1,
    note: 'Pago confirmado'
  });

  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({
      _id: orderId,

      'statusHistory.1': {
        $exists: false
      },

      'statusHistory.0.status': 'pending'
    }),

    {
      $push: {
        statusHistory: {
          status: 'paid',
          changedById: 1,
          changedAt: expect.any(Date),
          note: 'Pago confirmado'
        }
      }
    },

    {
      new: true,
      runValidators: true
    }
  );
});

test('Rechaza una transicion invalida', async () => {
  jest.spyOn(Order, 'findById')
    .mockResolvedValue(sampleOrder);

  const update = jest.spyOn(
    Order,
    'findOneAndUpdate'
  );

  await expect(
    orderService.changeOrderStatus(orderId, {
      status: 'delivered',
      changedById: 1
    })
  ).rejects.toMatchObject({
    status: 400
  });

  expect(update).not.toHaveBeenCalled();
});

test('Rechaza cambios en pedidos entregados', async () => {
  jest.spyOn(Order, 'findById')
    .mockResolvedValue({
      statusHistory: [{
        status: 'delivered'
      }]
    });

  await expect(
    orderService.changeOrderStatus(orderId, {
      status: 'pending',
      changedById: 1
    })
  ).rejects.toMatchObject({
    status: 400
  });
});

test('Detecta una actualizacion concurrente', async () => {
  jest.spyOn(Order, 'findById')
    .mockResolvedValue(sampleOrder);

  jest.spyOn(Order, 'findOneAndUpdate')
    .mockResolvedValue(null);

  await expect(
    orderService.changeOrderStatus(orderId, {
      status: 'paid',
      changedById: 1
    })
  ).rejects.toMatchObject({
    status: 409
  });
});

test('Filtra exclusivamente por el ultimo estado', async () => {
  jest.spyOn(Order, 'find')
    .mockReturnValue({
      populate: jest.fn().mockResolvedValue([])
    });

  await orderService.listAdminOrders('paid');

  expect(Order.find).toHaveBeenCalledWith({
    $expr: {
      $eq: [
        {
          $arrayElemAt: ['$statusHistory.status', -1]
        },
        'paid'
      ]
    }
  });
});
