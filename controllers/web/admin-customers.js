const createError = require('http-errors');

const customerService = require(
  '../../services/customer.service'
);

const { isMongoId } = require('../../utils/validation');

// GET /admin/customers
async function listCustomers(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');

    const customers =
      await customerService.listAdminCustomers();

    return res.render('admin/customers/index', {
      title: req.__('ssr.adminCustomers.title'),
      description: req.__('ssr.adminCustomers.description'),
      customers
    });

  } catch (err) {
    return next(err);
  }
}

// GET /admin/customers/:id
async function showCustomer(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');

    const id = req.params.id;

    if (!isMongoId(id)) {
      return next(createError(404));
    }

    const result =
      await customerService.findCustomerDetail(id);

    if (!result) {
      return next(createError(404));
    }

    return res.render('admin/customers/detail', {
      title: req.__('ssr.adminCustomers.detailTitle'),
      description: req.__('ssr.adminCustomers.detailDescription'),
      customer: result.customer,
      orders: result.orders
    });

  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listCustomers,
  showCustomer
};