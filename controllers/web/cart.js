
const createError = require('http-errors');

const cartService = require('../../services/cart.service');
const { isSqlId } = require('../../utils/validation');

function getItems(req) {
  return cartService.readCart(req.cookies?.cart);
}

// Guardar exclusivamente IDs y cantidades
function saveCart(req, res, items) {
  const options = {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.app.get('env') === 'production',
    path: '/'
  };

  if (items.length === 0) {
    return res.clearCookie('cart', options);
  }

  return res.cookie('cart', JSON.stringify(items), {
    ...options,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

// Mensaje temporal
function setFlash(req, res, key) {
  res.cookie('flash', JSON.stringify({
    type: 'success',
    message: req.__(key)
  }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.app.get('env') === 'production',
    maxAge: 60 * 1000,
    path: '/'
  });
}

// Renderizar bolsa
async function renderCart(
  req,
  res,
  status = 200,
  error = null,
  attempt = null
) {
  const cart = await cartService.getCart(
    getItems(req)
  );

  return res.status(status).render('store/cart', {
    title: req.__('ssr.cart.title'),
    description: req.__('ssr.cart.description'),
    cart,
    cartError: error ? req.__(error) : null,
    attempt
  });
}

// GET /cart
async function showCart(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');

    return await renderCart(req, res);

  } catch (err) {
    return next(err);
  }
}

// POST para agregar o actualizar
async function changeItem(req, res, next, adding) {
  try {
    const rawId = adding
      ? req.body?.variantId
      : req.params.variantId;

    const quantity = req.body?.quantity;

    if (!isSqlId(rawId)) {
      return next(createError(400));
    }

    const variantId = Number(rawId);

    const attempt = {
      adding,
      variantId,
      quantity: typeof quantity === 'string'
        ? quantity
        : ''
    };

    if (!cartService.validQuantity(quantity)) {
      return await renderCart(
        req,
        res,
        400,
        'ssr.cart.invalidQuantity',
        attempt
      );
    }

    const result = await cartService.changeQuantity(
      getItems(req),
      variantId,
      Number(quantity),
      adding
    );

    if (result.error) {
      if (result.status === 404) {
        return next(createError(404));
      }

      return await renderCart(
        req,
        res,
        result.status,
        result.error,
        attempt
      );
    }

    saveCart(req, res, result.items);

    setFlash(
      req,
      res,
      adding
        ? 'ssr.cart.added'
        : 'ssr.cart.updated'
    );

    return res.redirect(302, '/cart');

  } catch (err) {
    return next(err);
  }
}

// POST /cart/items
function addItem(req, res, next) {
  return changeItem(req, res, next, true);
}

// POST /cart/items/:variantId
function updateItem(req, res, next) {
  return changeItem(req, res, next, false);
}

// POST /cart/items/:variantId/delete
function deleteItem(req, res, next) {
  try {
    if (!isSqlId(req.params.variantId)) {
      return next(createError(400));
    }

    const variantId = Number(req.params.variantId);
    const items = getItems(req);

    if (!items.some(item => item.variantId === variantId)) {
      return next(createError(404));
    }

    const updated = cartService.removeItem(
      items,
      variantId
    );

    saveCart(req, res, updated);

    setFlash(req, res, 'ssr.cart.removed');

    return res.redirect(302, '/cart');

  } catch (err) {
    return next(err);
  }
}

module.exports = {
  showCart,
  addItem,
  updateItem,
  deleteItem
};