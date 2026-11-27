
const variantService = require('../services/variant.service');

const {
  VariantServiceError
} = variantService;

const {
  isSqlId,
  readBody,
  checkTypes,
  checkIds
} = require('../utils/validation');

// Leer y validar los datos recibidos por la API
function readVariantBody(body, creating = false) {
  const fields = [
    'productId',
    'sku',
    'size',
    'color',
    'active'
  ];

  const required = creating
    ? ['productId', 'sku', 'size', 'color']
    : [];

  const data = readBody(body, fields, required);

  checkTypes(data, ['sku', 'size', 'color'], 'string');
  checkTypes(data, ['active'], 'boolean');
  checkIds(data, ['productId']);

  // Eliminar espacios innecesarios
  for (const field of ['sku', 'size', 'color']) {
    if (typeof data[field] === 'string') {
      data[field] = data[field].trim();
    }
  }

  // SKU obligatorio
  if (Object.hasOwn(data, 'sku') && !data.sku) {
    const error = new Error('SKU_REQUIRED');
    error.status = 400;
    error.code = 'SKU_REQUIRED';
    throw error;
  }

  // Talla y color obligatorios al crear
  if (creating && (!data.size || !data.color)) {
    const error = new Error('INVALID_VARIANT_DATA');
    error.status = 400;
    throw error;
  }

  // Si se envían durante una edición, tampoco pueden quedar vacíos
  if (
    (!creating && Object.hasOwn(data, 'size') && !data.size) ||
    (!creating && Object.hasOwn(data, 'color') && !data.color)
  ) {
    const error = new Error('INVALID_VARIANT_DATA');
    error.status = 400;
    throw error;
  }

  return data;
}

// Convertir productId de la API a product_id de Sequelize
function toServiceData(data) {
  const result = {};

  if (Object.hasOwn(data, 'productId')) {
    result.product_id = data.productId;
  }

  for (const field of ['sku', 'size', 'color', 'active']) {
    if (Object.hasOwn(data, field)) {
      result[field] = data[field];
    }
  }

  return result;
}

// Validar ID de PostgreSQL
function validId(req, res) {
  if (isSqlId(req.params.id)) {
    return true;
  }

  res.status(400).json({
    message: req.__('common.invalidId'),
    data: null
  });

  return false;
}

// Manejar errores del servicio
function handleError(err, req, res, next) {
  if (err instanceof VariantServiceError) {
    if (err.code === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({
        message: req.__('variants.productNotFound'),
        data: null
      });
    }

    if (err.code === 'SKU_DUPLICATE') {
      return res.status(400).json({
        message: req.__('variants.duplicateSku'),
        data: null
      });
    }
  }

  // También detectar duplicados directamente desde PostgreSQL
  if (
    err.name === 'SequelizeUniqueConstraintError' ||
    err.original?.code === '23505' ||
    err.parent?.code === '23505'
  ) {
    return res.status(400).json({
      message: req.__('variants.duplicateSku'),
      data: null
    });
  }

  if (err.code === 'SKU_REQUIRED') {
    return res.status(400).json({
      message: req.__('variants.skuRequired'),
      data: null
    });
  }

  return next(err);
}

// GET /api/variants
async function list(req, res, next) {
  try {
    const variants = await variantService.listAll();

    return res.json({
      message: req.__('variants.list'),
      data: variants
    });
  } catch (err) {
    return handleError(err, req, res, next);
  }
}

// GET /api/variants/:id
async function find(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const variant = await variantService.findById(
      Number(req.params.id)
    );

    if (!variant) {
      return res.status(404).json({
        message: req.__('variants.notFound'),
        data: null
      });
    }

    return res.json({
      message: req.__('variants.found'),
      data: variant
    });
  } catch (err) {
    return handleError(err, req, res, next);
  }
}

// POST /api/variants
async function create(req, res, next) {
  try {
    const data = readVariantBody(req.body, true);

    const variant = await variantService.createVariant(
      toServiceData(data)
    );

    return res.status(201).json({
      message: req.__('variants.created'),
      data: variant
    });
  } catch (err) {
    return handleError(err, req, res, next);
  }
}

// PUT /api/variants/:id
async function update(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const data = readVariantBody(req.body);

    const variant = await variantService.updateVariant(
      Number(req.params.id),
      toServiceData(data)
    );

    if (!variant) {
      return res.status(404).json({
        message: req.__('variants.notFound'),
        data: null
      });
    }

    return res.json({
      message: req.__('variants.updated'),
      data: variant
    });
  } catch (err) {
    return handleError(err, req, res, next);
  }
}

// DELETE /api/variants/:id
async function destroy(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const variant = await variantService.deleteVariant(
      Number(req.params.id)
    );

    if (!variant) {
      return res.status(404).json({
        message: req.__('variants.notFound'),
        data: null
      });
    }

    return res.json({
      message: req.__('variants.deleted'),
      data: variant
    });
  } catch (err) {
    return handleError(err, req, res, next);
  }
}

module.exports = {
  list,
  create,
  find,
  update,
  destroy
};