const {
  calculateMovement,
  InventoryMovementError
} = require('../services/inventory-movement.service');

describe('Movimientos de inventario', () => {

  test('Enviar un pedido consume stock y reserva', () => {
    expect(
      calculateMovement(50, 12, 2, 'shipped')
    ).toEqual({
      stock: 48,
      reserved: 10
    });
  });

  test('Cancelar un pedido libera la reserva', () => {
    expect(
      calculateMovement(50, 12, 2, 'cancelled')
    ).toEqual({
      stock: 50,
      reserved: 10
    });
  });

  test('Permite consumir todas las existencias reservadas', () => {
    expect(
      calculateMovement(5, 5, 5, 'shipped')
    ).toEqual({
      stock: 0,
      reserved: 0
    });
  });

  test('Rechaza reservas insuficientes', () => {
    expect(() =>
      calculateMovement(50, 1, 2, 'shipped')
    ).toThrow(InventoryMovementError);
  });

  test('Rechaza inventario inconsistente', () => {
    expect(() =>
      calculateMovement(10, 15, 2, 'cancelled')
    ).toThrow(InventoryMovementError);
  });

  test.each([0, -1, 1.5, NaN])(
    'Rechaza una cantidad invalida: %s',
    quantity => {
      expect(() =>
        calculateMovement(
          50,
          10,
          quantity,
          'shipped'
        )
      ).toThrow(InventoryMovementError);
    }
  );

  test('No realiza movimientos al confirmar un pago', () => {
    expect(() =>
      calculateMovement(50, 10, 2, 'paid')
    ).toThrow(InventoryMovementError);
  });

});