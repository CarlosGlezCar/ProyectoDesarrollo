const { Op } = require('sequelize');

const {
  Product,
  ProductVariant,
  Inventory
} = require('../models/sql');

const categories = [
  { id: 1, key: 'running' },
  { id: 2, key: 'urban' },
  { id: 3, key: 'training' }
];

const variantsInclude = {
  model: ProductVariant,
  as: 'variants',
  include: {
    model: Inventory,
    as: 'inventory'
  }
};

function getCategories() {
  return categories.map(category => ({ ...category }));
}

function listAll() {
  return Product.findAll({
    include: variantsInclude
  });
}

async function listActive({
  q = '',
  category = '',
  page = 1,
  pageSize = 4
} = {}) {

  const where = {
    active: true
  };

  if (q) {
    const search = q.replace(/[\\%_]/g, '\\$&');

    where.name = {
      [Op.iLike]: `%${search}%`
    };
  }

  if (category) {
    where.category_id = Number(category);
  }

  const result = await Product.findAndCountAll({
    where,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    order: [['id', 'ASC']]
  });

  const totalPages = Math.max(
    1,
    Math.ceil(result.count / pageSize)
  );

  return {
    products: result.rows,
    total: result.count,
    page,
    pageSize,
    totalPages
  };
}

async function featured() {
  const result = await listActive({
    page: 1,
    pageSize: 4
  });

  return result.products;
}

async function findActiveById(id) {
  const product = await Product.findOne({
    where: {
      id,
      active: true
    },
    include: [
      {
        model: ProductVariant,
        as: 'variants',
        where: {
          active: true
        },
        required: false,
        include: [
          {
            model: Inventory,
            as: 'inventory',
            required: false
          }
        ]
      }
    ]
  });

  if (!product) {
    return null;
  }

  const data = product.get({ plain: true });

  data.variants = (data.variants || []).map(variant => {
    const stock = Number(variant.inventory?.stock ?? 0);
    const reserved = Number(variant.inventory?.reserved ?? 0);

    return {
      ...variant,
      available: stock - reserved
    };
  });

  return data;
}

// Buscar producto por ID (incluye productos inactivos)
async function findById(id, { includeVariants = false } = {}) {
  if (includeVariants) {
    return Product.findByPk(id, {
      include: variantsInclude
    });
  }

  return Product.findByPk(id);
}

// Crear producto
async function createProduct(data) {
  return Product.create(data);
}

// Actualizar producto
async function updateProduct(id, data) {
  const product = await Product.findByPk(id);

  if (!product) {
    return null;
  }

  await product.update(data);

  return product;
}

// Activar o desactivar producto
async function changeStatus(id, active) {
  return updateProduct(id, { active });
}

// Eliminar producto si no tiene variantes relacionadas
async function deleteProduct(id) {
  const product = await Product.findByPk(id);

  if (!product) {
    return null;
  }

  const variantsCount = await ProductVariant.count({
    where: {
      product_id: id
    }
  });

  if (variantsCount > 0) {
    return {
      product,
      deleted: false
    };
  }

  await product.destroy();

  return {
    product,
    deleted: true
  };
}

module.exports = {
  getCategories,
  listAll,
  listActive,
  featured,
  findActiveById,
  findById,
  createProduct,
  updateProduct,
  changeStatus,
  deleteProduct
};