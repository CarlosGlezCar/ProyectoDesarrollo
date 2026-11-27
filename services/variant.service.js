
const {
  sequelize,
  Product,
  ProductVariant,
  Inventory
} = require('../models/sql');

// Relaciones que necesitamos mostrar en el panel
const variantIncludes = [
  {
    model: Product,
    as: 'product'
  },
  {
    model: Inventory,
    as: 'inventory'
  }
];

// Errores propios del servicio
class VariantServiceError extends Error {
  constructor(code) {
    super(code);
    this.name = 'VariantServiceError';
    this.code = code;
  }
}

// Comprobar que el producto exista
async function assertProductExists(productId, transaction) {
  const product = await Product.findByPk(productId, {
    transaction
  });

  if (!product) {
    throw new VariantServiceError('PRODUCT_NOT_FOUND');
  }
}

// Comprobar que el SKU no esté repetido
async function assertSkuAvailable(sku, exceptId, transaction) {
  const existing = await ProductVariant.findOne({
    where: { sku },
    transaction
  });

  if (existing && existing.id !== exceptId) {
    throw new VariantServiceError('SKU_DUPLICATE');
  }
}

// Listar todas las variantes
async function listAll() {
  return ProductVariant.findAll({
    include: variantIncludes,
    order: [['id', 'ASC']]
  });
}

// Obtener productos disponibles para el formulario
async function listProducts() {
  return Product.findAll({
    attributes: ['id', 'name', 'active'],
    order: [['name', 'ASC']]
  });
}

// Buscar una variante por ID
async function findById(id) {
  return ProductVariant.findByPk(id, {
    include: variantIncludes
  });
}

// Comprobar si un SKU ya existe
async function skuExists(sku, exceptId = null) {
  const existing = await ProductVariant.findOne({
    where: { sku },
    attributes: ['id']
  });

  return Boolean(existing && existing.id !== exceptId);
}

// Crear variante e inicializar inventario
async function createVariant(data) {
  return sequelize.transaction(async transaction => {

    await assertProductExists(
      data.product_id,
      transaction
    );

    await assertSkuAvailable(
      data.sku,
      null,
      transaction
    );

    const variant = await ProductVariant.create({
      product_id: data.product_id,
      sku: data.sku,
      size: data.size,
      color: data.color,
      active: data.active ?? true
    }, {
      transaction
    });

    // Cada variante comienza con inventario en cero
    await Inventory.create({
      variant_id: variant.id,
      stock: 0,
      reserved: 0
    }, {
      transaction
    });

    return ProductVariant.findByPk(variant.id, {
      include: variantIncludes,
      transaction
    });
  });
}

// Actualizar variante
async function updateVariant(id, data) {
  return sequelize.transaction(async transaction => {

    const variant = await ProductVariant.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!variant) {
      return null;
    }

    if (Object.hasOwn(data, 'product_id')) {
      await assertProductExists(
        data.product_id,
        transaction
      );
    }

    if (Object.hasOwn(data, 'sku')) {
      await assertSkuAvailable(
        data.sku,
        id,
        transaction
      );
    }

    await variant.update(data, {
      transaction
    });

    return ProductVariant.findByPk(id, {
      include: variantIncludes,
      transaction
    });
  });
}

// Eliminar variante e inventario dentro de una transacción
async function deleteVariant(id) {
  return sequelize.transaction(async transaction => {
    const variant = await ProductVariant.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!variant) {
      return null;
    }

    await Inventory.destroy({
      where: {
        variant_id: variant.id
      },
      transaction
    });

    await variant.destroy({
      transaction
    });

    return variant;
  });
}

module.exports = {
  VariantServiceError,
  listAll,
  listProducts,
  findById,
  skuExists,
  createVariant,
  updateVariant,
  deleteVariant
};
