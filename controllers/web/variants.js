
const createError = require('http-errors');

const variantService = require('../../services/variant.service');
const { VariantServiceError } = variantService;
const { isSqlId } = require('../../utils/validation');

// Leer los datos del formulario
function readVariantValues(body) {
  const source = body && typeof body === 'object' && !Array.isArray(body)
    ? body
    : {};

  const read = field =>
    typeof source[field] === 'string'
      ? source[field].trim()
      : '';

  return {
    productId: read('productId'),
    sku: read('sku'),
    size: read('size'),
    color: read('color')
  };
}

// Validar los datos
function validateVariant(values, req) {
  const errors = {};

  if (!values.productId) {
    errors.productId = req.__('ssr.variants.productRequired');
  } else if (!isSqlId(values.productId)) {
    errors.productId = req.__('ssr.variants.invalidProduct');
  }

  if (!values.sku) {
    errors.sku = req.__('ssr.variants.skuRequired');
  } else if (values.sku.length > 100) {
    errors.sku = req.__('ssr.variants.skuTooLong');
  }

  if (!values.size) {
    errors.size = req.__('ssr.variants.sizeRequired');
  } else if (values.size.length > 20) {
    errors.size = req.__('ssr.variants.sizeTooLong');
  }

  if (!values.color) {
    errors.color = req.__('ssr.variants.colorRequired');
  } else if (values.color.length > 30) {
    errors.color = req.__('ssr.variants.colorTooLong');
  }

  return errors;
}

// Convertir los datos al formato del servicio
function toVariantData(values) {
  return {
    product_id: Number(values.productId),
    sku: values.sku,
    size: values.size,
    color: values.color
  };
}

// Convertir una variante para mostrarla en el formulario
function variantToForm(variant) {
  return {
    productId: String(variant.product_id),
    sku: variant.sku,
    size: variant.size || '',
    color: variant.color || ''
  };
}

// Mensaje temporal para mostrar después de redirigir
function setFlash(req, res, type, message) {
  res.cookie('flash', JSON.stringify({
    type,
    message
  }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.app.get('env') === 'production',
    maxAge: 60 * 1000,
    path: '/'
  });
}

// Renderizar el formulario de variantes
async function renderVariantForm(
  req,
  res,
  {
    variant,
    errors = {},
    isEdit = false,
    id = null,
    status = 200
  }
) {
  const title = req.__(
    isEdit
      ? 'ssr.variants.editTitle'
      : 'ssr.variants.newTitle'
  );

  const products = await variantService.listProducts();

  return res.status(status).render('admin/variants/form', {
    title,
    description: req.__('ssr.variants.formDescription'),
    formAction: isEdit
      ? `/admin/variants/${id}`
      : '/admin/variants',
    variant,
    products,
    errors,
    isEdit
  });
}

// Obtener y validar ID
function getVariantId(req) {
  if (!isSqlId(req.params.id)) {
    throw createError(400);
  }

  return Number(req.params.id);
}

// Traducir errores del servicio
function getVariantErrors(err, req) {
  const errors = {};

  if (err instanceof VariantServiceError) {
    if (err.code === 'PRODUCT_NOT_FOUND') {
      errors.productId = req.__('ssr.variants.invalidProduct');
      return errors;
    }

    if (err.code === 'SKU_DUPLICATE') {
      errors.sku = req.__('ssr.variants.duplicateSku');
      return errors;
    }
  }

  if (
    err.name === 'SequelizeUniqueConstraintError' ||
    err.original?.code === '23505' ||
    err.parent?.code === '23505'
  ) {
    errors.sku = req.__('ssr.variants.duplicateSku');
    return errors;
  }

  return null;
}

// GET /admin/variants
async function listVariants(req, res, next) {
  try {
    const variants = await variantService.listAll();

    return res.render('admin/variants/index', {
      title: req.__('ssr.variants.title'),
      description: req.__('ssr.variants.description'),
      variants
    });
  } catch (err) {
    return next(err);
  }
}

// GET /admin/variants/new
async function newVariant(req, res, next) {
  try {
    return await renderVariantForm(req, res, {
      variant: {
        productId: '',
        sku: '',
        size: '',
        color: ''
      }
    });
  } catch (err) {
    return next(err);
  }
}

// POST /admin/variants
async function createVariant(req, res, next) {
  const values = readVariantValues(req.body);
  const errors = validateVariant(values, req);

  if (Object.keys(errors).length > 0) {
    try {
      return await renderVariantForm(req, res, {
        variant: values,
        errors,
        status: 400
      });
    } catch (err) {
      return next(err);
    }
  }

  try {
    await variantService.createVariant(toVariantData(values));

    setFlash(
      req,
      res,
      'success',
      req.__('ssr.variants.created')
    );

    return res.redirect(302, '/admin/variants');

  } catch (err) {
    const serviceErrors = getVariantErrors(err, req);

    if (serviceErrors) {
      try {
        return await renderVariantForm(req, res, {
          variant: values,
          errors: serviceErrors,
          status: 400
        });
      } catch (renderError) {
        return next(renderError);
      }
    }

    return next(err);
  }
}

// GET /admin/variants/:id/edit
async function editVariant(req, res, next) {
  try {
    const id = getVariantId(req);
    const variant = await variantService.findById(id);

    if (!variant) {
      return next(createError(404));
    }

    return await renderVariantForm(req, res, {
      variant: variantToForm(variant),
      isEdit: true,
      id
    });

  } catch (err) {
    return next(err);
  }
}

// POST /admin/variants/:id
async function updateVariant(req, res, next) {
  try {
    const id = getVariantId(req);

    const existing = await variantService.findById(id);

    if (!existing) {
      return next(createError(404));
    }

    const values = readVariantValues(req.body);
    const errors = validateVariant(values, req);

    if (Object.keys(errors).length > 0) {
      return await renderVariantForm(req, res, {
        variant: values,
        errors,
        isEdit: true,
        id,
        status: 400
      });
    }

    const updated = await variantService.updateVariant(
      id,
      toVariantData(values)
    );

    if (!updated) {
      return next(createError(404));
    }

    setFlash(
      req,
      res,
      'success',
      req.__('ssr.variants.updated')
    );

    return res.redirect(302, '/admin/variants');

  } catch (err) {
    const serviceErrors = getVariantErrors(err, req);

    if (serviceErrors) {
      try {
        const id = getVariantId(req);

        return await renderVariantForm(req, res, {
          variant: readVariantValues(req.body),
          errors: serviceErrors,
          isEdit: true,
          id,
          status: 400
        });
      } catch (renderError) {
        return next(renderError);
      }
    }

    return next(err);
  }
}

module.exports = {
  listVariants,
  newVariant,
  createVariant,
  editVariant,
  updateVariant
};