class InventoryMovementError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InventoryMovementError';
    this.status = 409;
  }
}

function calculateMovement(stock, reserved, quantity, status) {
  if (
    !Number.isInteger(stock) ||
    !Number.isInteger(reserved) ||
    !Number.isInteger(quantity) ||
    stock < 0 ||
    reserved < 0 ||
    reserved > stock ||
    quantity <= 0
  ) {
    throw new InventoryMovementError(
      'Invalid inventory values'
    );
  }

  if (!['shipped', 'cancelled'].includes(status)) {
    throw new InventoryMovementError(
      'Invalid inventory movement'
    );
  }

  if (reserved < quantity) {
    throw new InventoryMovementError(
      'Insufficient reserved inventory'
    );
  }

  return {
    stock: status === 'shipped'
      ? stock - quantity
      : stock,

    reserved: reserved - quantity
  };
}

module.exports = {
  InventoryMovementError,
  calculateMovement
};