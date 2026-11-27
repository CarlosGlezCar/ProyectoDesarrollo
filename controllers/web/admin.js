
const createError = require('http-errors');

const productService = require('../../services/product.service');
const { isSqlId } = require('../../utils/validation');

const pricePattern = /^\d{1,8}(\.\d{1,2})?$/;

// Leer los valores enviados por el formulario
function readFormValues(body) {
  const source = body && typeof body === 'object' && !Array.isArray(body)
    ? body
    : {};

  const read = (field) =>
    typeof source[field] === 'string'
      ? source[field].trim()
      : '';

  return {
    categoryId: read('categoryId'),
    name: read('name'),
    description: read('description'),
    brand: read('brand'),
    price: read('price'),
    active: read('active')
  };
}

// Validaciones del servidor
function validateProduct(values, req) {
  const errors = {};
  const categories = productService.getCategories();

  if (!values.categoryId) {
    errors.categoryId = req.__('ssr.products.categoryRequired');
  } else if (
    !categories.some(
      category => String(category.id) === values.categoryId
    )
  ) {
    errors.categoryId = req.__('ssr.products.invalidCategory');
  }

  if (!values.name) {
    errors.name = req.__('ssr.products.nameRequired');
  } else if (values.name.length > 150) {
    errors.name = req.__('ssr.products.nameTooLong');
  }

  if (!values.description) {
    errors.description = req.__('ssr.products.descriptionRequired');
  }

  if (!values.brand) {
    errors.brand = req.__('ssr.products.brandRequired');
  } else if (values.brand.length > 100) {
    errors.brand = req.__('ssr.products.brandTooLong');
  }

  if (
    !pricePattern.test(values.price) ||
    Number(values.price) > 99999999.99
  ) {
    errors.price = req.__('ssr.products.invalidPrice');
  }

  if (!['true', 'false'].includes(values.active)) {
    errors.active = req.__('ssr.products.invalidStatus');
  }

  return errors;
}

// Convertir los datos al formato del modelo Sequelize
function toProductData(values) {
  return {
    category_id: Number(values.categoryId),
    name: values.name,
    description: values.description,
    brand: values.brand,
    price: values.price,
    active: values.active === 'true'
  };
}

// Datos de un producto para el formulario
function productToForm(product) {
  return {
    categoryId: String(product.category_id),
    name: product.name,
    description: product.description,
    brand: product.brand,
    price: String(product.price),
    active: product.active ? 'true' : 'false'
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

// Renderizar formulario
function renderProductForm(
  req,
  res,
  {
    product,
    errors = {},
    isEdit = false,
    id = null,
    status = 200
  }
) {
  const title = req.__(
    isEdit
      ? 'ssr.products.editTitle'
      : 'ssr.products.newTitle'
  );

  return res.status(status).render('admin/products/form', {
    title,
    description: req.__('ssr.products.formDescription'),
    formTitle: title,
    formAction: isEdit
      ? `/admin/products/${id}`
      : '/admin/products',
    product,
    categories: productService.getCategories(),
    errors,
    isEdit
  });
}

// Validar ID SQL
function getProductId(req) {
  if (!isSqlId(req.params.id)) {
    throw createError(400);
  }

  return Number(req.params.id);
}

// GET /admin/products
async function listProducts(req, res, next) {
  try {
    const products = await productService.listAll();

    const categoryKeyById = Object.fromEntries(
      productService.getCategories().map(category => [
        category.id,
        category.key
      ])
    );

    return res.render('admin/products/index', {
      title: req.__('ssr.products.title'),
      description: req.__('ssr.products.description'),
      products,
      categoryKeyById
    });
  } catch (err) {
    return next(err);
  }
}

// GET /admin/products/new
function newProduct(req, res) {
  return renderProductForm(req, res, {
    product: {
      categoryId: '',
      name: '',
      description: '',
      brand: '',
      price: '',
      active: 'true'
    }
  });
}

// POST /admin/products
async function createProduct(req, res, next) {
  const values = readFormValues(req.body);
  const errors = validateProduct(values, req);

  if (Object.keys(errors).length > 0) {
    return renderProductForm(req, res, {
      product: values,
      errors,
      status: 400
    });
  }

  try {
    await productService.createProduct(toProductData(values));

    setFlash(
      req,
      res,
      'success',
      req.__('ssr.products.created')
    );

    return res.redirect(302, '/admin/products');
  } catch (err) {
    return next(err);
  }
}

// GET /admin/products/:id/edit
async function editProduct(req, res, next) {
  try {
    const id = getProductId(req);
    const product = await productService.findById(id);

    if (!product) {
      return next(createError(404));
    }

    return renderProductForm(req, res, {
      product: productToForm(product),
      isEdit: true,
      id
    });
  } catch (err) {
    return next(err);
  }
}

// POST /admin/products/:id
async function updateProduct(req, res, next) {
  try {
    const id = getProductId(req);
    const existing = await productService.findById(id);

    if (!existing) {
      return next(createError(404));
    }

    const values = readFormValues(req.body);
    const errors = validateProduct(values, req);

    if (Object.keys(errors).length > 0) {
      return renderProductForm(req, res, {
        product: values,
        errors,
        isEdit: true,
        id,
        status: 400
      });
    }

    const product = await productService.updateProduct(
      id,
      toProductData(values)
    );

    if (!product) {
      return next(createError(404));
    }

    setFlash(
      req,
      res,
      'success',
      req.__('ssr.products.updated')
    );

    return res.redirect(302, '/admin/products');
  } catch (err) {
    return next(err);
  }
}

// POST /admin/products/:id/status
async function changeProductStatus(req, res, next) {
  try {
    const id = getProductId(req);
    const active = req.body?.active;

    if (active !== 'true' && active !== 'false') {
      return next(createError(400));
    }

    const product = await productService.changeStatus(
      id,
      active === 'true'
    );

    if (!product) {
      return next(createError(404));
    }

    setFlash(
      req,
      res,
      'success',
      req.__(
        active === 'true'
          ? 'ssr.products.activated'
          : 'ssr.products.deactivated'
      )
    );

    return res.redirect(302, '/admin/products');
  } catch (err) {
    return next(err);
  }
}

// POST /admin/products/:id/delete
async function deleteProduct(req, res, next) {
  try {
    const id = getProductId(req);
    const result = await productService.deleteProduct(id);

    if (!result) {
      return next(createError(404));
    }

    if (!result.deleted) {
      setFlash(
        req,
        res,
        'error',
        req.__('ssr.products.cannotDeleteWithVariants')
      );

      return res.redirect(302, '/admin/products');
    }

    setFlash(
      req,
      res,
      'success',
      req.__('ssr.products.deleted')
    );

    return res.redirect(302, '/admin/products');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listProducts,
  newProduct,
  createProduct,
  editProduct,
  updateProduct,
  changeProductStatus,
  deleteProduct
};