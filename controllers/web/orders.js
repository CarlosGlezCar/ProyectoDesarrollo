
const createError = require('http-errors');

const orderService = require('../../services/order.service');
const { isMongoId } = require('../../utils/validation');

// GET /my/orders
async function listMyOrders(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');

    const orders = await orderService.listOwnOrders(
      Number(req.user.id)
    );

    return res.render('store/orders/index', {
      title: req.__('ssr.myOrders.title'),
      description: req.__('ssr.myOrders.description'),
      orders
    });

  } catch (err) {
    return next(err);
  }
}

// GET /my/orders/:id
async function showMyOrder(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');

    const id = req.params.id;

    if (!isMongoId(id)) {
      return next(createError(404));
    }

    const result = await orderService.findOwnOrder(
      id,
      Number(req.user.id)
    );

    if (!result.order) {
      return next(createError(result.status));
    }

    return res.render('store/orders/detail', {
      title: req.__('ssr.myOrders.detailTitle'),
      description: req.__('ssr.myOrders.detailDescription'),
      order: result.order
    });

  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listMyOrders,
  showMyOrder
};