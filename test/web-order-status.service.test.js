
const service = require(
  '../services/web-order-status.service'
);

const reservationService = require(
  '../services/reservation.service'
);

const {
  sequelize,
  CheckoutAttempt,
  OrderStatusOperation,
  Inventory
} = require('../models/sql');

const { Order } = require('../models/mongo');

const id = '507f1f77bcf86cd799439021';

const transaction = {
  LOCK: { UPDATE: 'UPDATE' }
};

let order;
let inventory;
let reservation;
let operation;
let mongoUpdate;

function entry(status) {
  return {
    status,
    changedById: 1,
    changedAt: new Date('2026-11-26T20:00:00Z'),
    note: 'Prueba'
  };
}

beforeEach(() => {

  operation = null;

  order = {
    _id: id,
    channel: 'web',
    items: [
      { variantId: 1, quantity: 2 }
    ],
    statusHistory: [
      { status: 'pending' },
      { status: 'paid' }
    ]
  };

  inventory = {
    stock: 50,
    reserved: 12,
    update: jest.fn().mockImplementation(async changes => {
      Object.assign(inventory, changes);
    })
  };

  reservation = {
    variant_id: 1,
    quantity: 2,
    status: 'reserved',

    update: jest.fn().mockImplementation(async changes => {
      Object.assign(reservation, changes);
    })
  };

  jest.spyOn(sequelize, 'transaction')
    .mockImplementation(
      async callback => callback(transaction)
    );

  jest.spyOn(CheckoutAttempt, 'findByPk')
    .mockResolvedValue({
      order_id: id,
      status: 'completed'
    });

  jest.spyOn(Order, 'findById')
    .mockImplementation(async () => order);

  jest.spyOn(Inventory, 'findOne')
    .mockResolvedValue(inventory);

  jest.spyOn(reservationService, 'findByOrder')
    .mockResolvedValue([reservation]);

  jest.spyOn(reservationService, 'reservedForVariant')
    .mockResolvedValue(2);

  jest.spyOn(OrderStatusOperation, 'findOne')
    .mockImplementation(async ({ where }) => {

      if (
        where.status === 'pending' &&
        operation?.status !== 'pending'
      ) {
        return null;
      }

      return operation;
    });

  jest.spyOn(OrderStatusOperation, 'create')
    .mockImplementation(async data => {

      operation = {
        ...data,

        update: jest.fn().mockImplementation(async changes => {
          Object.assign(operation, changes);
        })
      };

      return operation;
    });

  mongoUpdate = jest.spyOn(Order, 'findOneAndUpdate')
    .mockImplementation(async (filter, update) => {
      order.statusHistory.push(
        update.$push.statusHistory
      );

      return order;
    });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('Enviar consume stock y reserva', async () => {

  await service.changeWebOrderStatus(
    id,
    entry('shipped'),
    2,
    'paid'
  );

  expect(inventory.stock).toBe(48);
  expect(inventory.reserved).toBe(10);

  expect(reservation.status).toBe('consumed');

  expect(operation.status).toBe('completed');

  expect(order.statusHistory).toHaveLength(3);

  expect(order.statusHistory[2].status)
    .toBe('shipped');

});

test('Cancelar libera la reserva sin reducir stock', async () => {

  await service.changeWebOrderStatus(
    id,
    entry('cancelled'),
    2,
    'paid'
  );

  expect(inventory.stock).toBe(50);
  expect(inventory.reserved).toBe(10);

  expect(reservation.status).toBe('released');

});

test('Rechaza pedidos sin reservas identificadas', async () => {

  reservationService.findByOrder
    .mockResolvedValue([]);

  await expect(
    service.changeWebOrderStatus(
      id,
      entry('shipped'),
      2,
      'paid'
    )
  ).rejects.toMatchObject({
    status: 409
  });

  expect(inventory.update)
    .not.toHaveBeenCalled();

  expect(mongoUpdate)
    .not.toHaveBeenCalled();

});

test('Recupera una operacion sin repetir el descuento', async () => {

  mongoUpdate.mockRejectedValueOnce(
    new Error('MongoDB unavailable')
  );

  await expect(
    service.changeWebOrderStatus(
      id,
      entry('shipped'),
      2,
      'paid'
    )
  ).rejects.toThrow('MongoDB unavailable');

  expect(operation.status).toBe('pending');

  expect(inventory.stock).toBe(48);

  await service.completeOperation(id, 2);

  expect(operation.status).toBe('completed');

  expect(inventory.stock).toBe(48);

  expect(inventory.update)
    .toHaveBeenCalledTimes(1);

  expect(order.statusHistory)
    .toHaveLength(3);

});

test('No agrega dos veces una entrada ya aplicada', async () => {

  await service.changeWebOrderStatus(
    id,
    entry('shipped'),
    2,
    'paid'
  );

  // Simular que SQL no alcanzo a confirmar
  // despues de la escritura en MongoDB
  operation.status = 'pending';

  await service.completeOperation(id, 2);

  expect(operation.status).toBe('completed');

  expect(mongoUpdate)
    .toHaveBeenCalledTimes(1);

  expect(inventory.update)
    .toHaveBeenCalledTimes(1);

  expect(order.statusHistory)
    .toHaveLength(3);

});
