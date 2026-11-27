
const createError = require('http-errors');

const inventoryService = require('../../services/inventory.service');
const { isSqlId } = require('../../utils/validation');

const MAX_QUANTITY = 2147483647;

// Obtener los valores del formulario
function readValues(body) {
  return {
    stock: typeof body?.stock === 'string'
      ? body.stock.trim()
      : '',

    reserved: typeof body?.reserved === 'string'
      ? body.reserved.trim()
      : ''
  };
}

// Validar un numero entero no negativo
function isValidQuantity(value) {
  return /^\d+$/.test(value) &&
    Number.isInteger(Number(value)) &&
    Number(value) <= MAX_QUANTITY;
}

// Validaciones del formulario
function validateValues(values, req) {
  const errors = {};

  if (!isValidQuantity(values.stock)) {
    errors.stock = req.__('ssr.inventory.invalidStock');
  }

  if (!isValidQuantity(values.reserved)) {
    errors.reserved = req.__('ssr.inventory.invalidReserved');
  }

  if (
    !errors.stock &&
    !errors.reserved &&
    Number(values.reserved) > Number(values.stock)
  ) {
    errors.reserved = req.__(
      'ssr.inventory.reservedExceedsStock'
    );
  }

  return errors;
}

// Renderizar inventario
async function renderInventory(
  req,
  res,
  {
    status = 200,
    errors = {},
    values = {},
    editingVariantId = null
  } = {}
) {
  const inventory = await inventoryService.listAll();

  return res.status(status).render('admin/inventory/index', {
    title: req.__('ssr.inventory.title'),
    description: req.__('ssr.inventory.description'),
    inventory,
    errors,
    values,
    editingVariantId
  });
}

// Mensaje de confirmacion
function setFlash(req, res, message) {
  res.cookie('flash', JSON.stringify({
    type: 'success',
    message
  }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.app.get('env') === 'production',
    maxAge: 60 * 1000,
    path: '/'
  });
}

// GET /admin/inventory
async function listInventory(req, res, next) {
  try {
    return await renderInventory(req, res);
  } catch (err) {
    return next(err);
  }
}

// POST /admin/inventory/:variantId
async function updateInventory(req, res, next) {
  try {
    if (!isSqlId(req.params.variantId)) {
      return next(createError(400));
    }

    const variantId = Number(req.params.variantId);

    const existing = await inventoryService.findByVariantId(
      variantId
    );

    if (!existing) {
      return next(createError(404));
    }

    const values = readValues(req.body);
    const errors = validateValues(values, req);

    if (Object.keys(errors).length > 0) {
      return await renderInventory(req, res, {
        status: 400,
        errors,
        values,
        editingVariantId: variantId
      });
    }

    const result = await inventoryService.updateByVariantId(
      variantId,
      {
        stock: Number(values.stock),
        reserved: Number(values.reserved)
      }
    );

    if (result.error) {
      if (result.status === 404) {
        return next(createError(404));
      }

    if (result.error === 'inventory.protectedReservations') {
      return await renderInventory(req, res, {
        status: 400,
        errors: {
          reserved: req.__(result.error)
        },
        values,
        editingVariantId: variantId
      });
  }

      return await renderInventory(req, res, {
        status: 400,
        errors: {
          general: req.__(result.error)
        },
        values,
        editingVariantId: variantId
      });
    }

    setFlash(
      req,
      res,
      req.__('ssr.inventory.updated')
    );

    return res.redirect(302, '/admin/inventory');

  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listInventory,
  updateInventory
};