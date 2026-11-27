const express = require('express');

const controller = require('../../controllers/web/store');
const authenticate = require('../../middlewares/authenticate');
const cartController = require('../../controllers/web/cart');
const webPost = require('../../middlewares/web-post');
const checkoutController = require('../../controllers/web/checkout');
const authorize = require('../../middlewares/authorize');
const createError = require('http-errors');
const { isMongoId } = require('../../utils/validation');
const ordersController = require('../../controllers/web/orders');

const router = express.Router();

router.get(
  '/',
  authenticate.optional,
  controller.home
);

router.get(
  '/products',
  authenticate.optional,
  controller.catalog
);

router.get(
  '/products/:id',
  authenticate.optional,
  controller.detail
);

// ==========================================
// F4 - BOLSA DE COMPRA
// ==========================================

router.get(
  '/cart',
  cartController.showCart
);

router.post(
  '/cart/items',
  webPost,
  cartController.addItem
);

router.post(
  '/cart/items/:variantId',
  webPost,
  cartController.updateItem
);

router.post(
  '/cart/items/:variantId/delete',
  webPost,
  cartController.deleteItem
);

// ==========================================
// F5 - CHECKOUT Y CONFIRMACION
// ==========================================

router.get(
  '/checkout',
  authenticate,
  authorize('orders', 'create', 'own', {
    checkout: true
  }),
  checkoutController.showCheckout
);

router.post(
  '/checkout',
  authenticate,
  webPost,
  authorize('orders', 'create', 'own', {
    checkout: true
  }),
  checkoutController.placeOrder
);

router.get(
  '/my/orders/:id/confirmation',
  authenticate,

  (req, res, next) => {
    if (!isMongoId(req.params.id)) {
      return next(createError(404));
    }

    return next();
  },

  authorize('orders', 'read', 'own'),
  checkoutController.confirmation
);

// ==========================================
// F6 - MIS PEDIDOS
// ==========================================

router.get(
  '/my/orders',
  authenticate,
  authorize('orders', 'read', 'own'),
  ordersController.listMyOrders
);

router.get(
  '/my/orders/:id',
  authenticate,

  (req, res, next) => {
    if (!isMongoId(req.params.id)) {
      return next(createError(404));
    }

    return next();
  },

  authorize('orders', 'read', 'own'),
  ordersController.showMyOrder
);

module.exports = router;