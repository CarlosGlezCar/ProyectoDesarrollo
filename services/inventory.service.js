const reservationService = require('./reservation.service');
const {
  sequelize,
  Inventory,
  ProductVariant,
  Product
} = require('../models/sql');

const MAX_QUANTITY = 2147483647;

const variantInclude = {
  model: ProductVariant,
  as: 'variant',
  include: {
    model: Product,
    as: 'product'
  }
};

// Validar las cantidades
function balanceError(stock, reserved) {
  if (
    !Number.isInteger(stock) ||
    !Number.isInteger(reserved) ||
    stock > MAX_QUANTITY ||
    reserved > MAX_QUANTITY
  ) {
    return 'common.invalidData';
  }

  if (stock < 0) {
    return 'inventory.stockNegative';
  }

  if (reserved < 0) {
    return 'inventory.reservedNegative';
  }

  if (reserved > stock) {
    return 'inventory.reservedExceedsStock';
  }

  return null;
}

// Listar inventarios con sus variantes y productos
async function listAll() {
  return Inventory.findAll({
    include: variantInclude
  });
}

// Buscar inventario por su ID
async function findById(id) {
  return Inventory.findByPk(id, {
    include: variantInclude
  });
}

// Buscar inventario por el ID de la variante
async function findByVariantId(variantId) {
  return Inventory.findOne({
    where: {
      variant_id: variantId
    },
    include: variantInclude
  });
}

// Crear inventario
async function createInventory(data) {
  const stock = data.stock ?? 0;
  const reserved = data.reserved ?? 0;

  const error = balanceError(stock, reserved);

  if (error) {
    return { status: 400, error };
  }

  return sequelize.transaction(async transaction => {

    const variant = await ProductVariant.findByPk(
      data.variantId,
      { transaction }
    );

    if (!variant) {
      return {
        status: 404,
        error: 'inventory.variantNotFound'
      };
    }

    const existing = await Inventory.findOne({
      where: {
        variant_id: data.variantId
      },
      transaction
    });

    if (existing) {
      return {
        status: 400,
        error: 'common.duplicate'
      };
    }

    const created = await Inventory.create({
      variant_id: data.variantId,
      stock,
      reserved
    }, {
      transaction
    });

    return {
      inventory: await created.reload({
        include: variantInclude,
        transaction
      })
    };
  });
}

// Logica compartida de actualizacion
async function updateInventory(id, data, byVariant = false) {
  return sequelize.transaction(async transaction => {

    const options = {
      transaction,
      lock: transaction.LOCK.UPDATE
    };

    const inventory = byVariant
      ? await Inventory.findOne({
          ...options,
          where: { variant_id: id }
        })
      : await Inventory.findByPk(id, options);

    if (!inventory) {
      return {
        status: 404,
        error: 'inventory.notFound'
      };
    }

    const stock = data.stock ?? inventory.stock;
    const reserved = data.reserved ?? inventory.reserved;

    const error = balanceError(stock, reserved);

    if (error) {
      return {
        status: 400,
        error
      };
    }

    // Consultar las reservas que pertenecen a pedidos activos
    const protectedReserved =
      await reservationService.reservedForVariant(
        inventory.variant_id,
        transaction
      );

    // Impedir que un ajuste manual libere reservas de pedidos
    if (reserved < protectedReserved) {
      return {
        status: 400,
        error: 'inventory.protectedReservations'
      };
    }

    await inventory.update(data, {
      transaction
    });

    return {
      inventory: await inventory.reload({
        include: variantInclude,
        transaction
      })
    };
  });
}

// Actualizar utilizando el ID del inventario (API)
async function updateById(id, data) {
  return updateInventory(id, data);
}

// Actualizar utilizando el ID de la variante (SSR)
async function updateByVariantId(variantId, data) {
  return updateInventory(variantId, data, true);
}

// Eliminar inventario (API existente)
async function deleteInventory(id) {
  const inventory = await Inventory.findByPk(id);

  if (!inventory) {
    return null;
  }

  await inventory.destroy();

  return inventory;
}

module.exports = {
  balanceError,
  listAll,
  findById,
  findByVariantId,
  createInventory,
  updateById,
  updateByVariantId,
  deleteInventory
};