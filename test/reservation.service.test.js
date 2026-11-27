const reservationService = require(
  '../services/reservation.service'
);

const { OrderReservation } = require('../models/sql');

const orderId = '507f1f77bcf86cd799439021';

const transaction = {};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Servicio de reservas por pedido', () => {

  test('Registra las reservas individuales', async () => {

    const bulkCreate = jest.spyOn(
      OrderReservation,
      'bulkCreate'
    ).mockResolvedValue([]);

    await reservationService.registerReservations(
      orderId,
      [
        { variantId: 1, quantity: 2 },
        { variantId: 3, quantity: 5 }
      ],
      transaction
    );

    expect(bulkCreate).toHaveBeenCalledWith([
      {
        order_id: orderId,
        variant_id: 1,
        quantity: 2,
        status: 'reserved'
      },
      {
        order_id: orderId,
        variant_id: 3,
        quantity: 5,
        status: 'reserved'
      }
    ], {
      transaction,
      validate: true
    });

  });

  test('Rechaza registros sin transaccion', async () => {

    await expect(
      reservationService.registerReservations(
        orderId,
        [{ variantId: 1, quantity: 2 }]
      )
    ).rejects.toThrow('Transaction required');

  });

  test('Consulta solamente reservas activas', async () => {

    const sum = jest.spyOn(
      OrderReservation,
      'sum'
    ).mockResolvedValue(7);

    const total =
      await reservationService.reservedForVariant(
        1,
        transaction
      );

    expect(total).toBe(7);

    expect(sum).toHaveBeenCalledWith(
      'quantity',
      {
        where: {
          variant_id: 1,
          status: 'reserved'
        },
        transaction
      }
    );

  });

  test('Devuelve cero cuando no existen reservas', async () => {

    jest.spyOn(OrderReservation, 'sum')
      .mockResolvedValue(null);

    expect(
      await reservationService.reservedForVariant(1)
    ).toBe(0);

  });

  test('Consulta reservas de un pedido especifico', async () => {

    const findAll = jest.spyOn(
      OrderReservation,
      'findAll'
    ).mockResolvedValue([]);

    await reservationService.findByOrder(
      orderId,
      transaction
    );

    expect(findAll).toHaveBeenCalledWith({
      where: {
        order_id: orderId
      },
      order: [['variant_id', 'ASC']],
      transaction
    });

  });

  test('Propaga los errores de escritura', async () => {

    jest.spyOn(OrderReservation, 'bulkCreate')
      .mockRejectedValue(
        new Error('Duplicate reservation')
      );

    await expect(
      reservationService.registerReservations(
        orderId,
        [{ variantId: 1, quantity: 2 }],
        transaction
      )
    ).rejects.toThrow('Duplicate reservation');

  });

});