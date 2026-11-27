const { AccessControl } = require('accesscontrol');
const { Role, Permission } = require('../models/sql');
const { Order, Customer } = require('../models/mongo');
const createError = require('http-errors');
const { isApi } = require('../utils/web-session');

function parsePermissionKey(key) {
  const parts = key.split(':');

  if (
    parts.length !== 3 ||
    !parts[0] ||
    !['create', 'read', 'update', 'delete'].includes(parts[1]) ||
    !['own', 'any'].includes(parts[2])
  ) {
    return null;
  }

  return {
    resource: parts[0],
    action: parts[1],
    possession: parts[2]
  };
}

async function checkOrderOwnership(req) {
  if (req.permission.action === 'create') {
    const customer = await Customer.findById(req.body.customerId);

    return Boolean(
      customer && String(customer.userId) === String(req.user.id)
    );
  }

  const order = await Order.findById(req.params.id);

  if (!order) return null;

  const customer = await Customer.findById(order.customerId);

  return Boolean(
    customer && String(customer.userId) === String(req.user.id)
  );
}

async function checkCustomerOwnership(req) {
  const customer = await Customer.findById(req.params.id);

  if (!customer) return null;

  return String(customer.userId) === String(req.user.id);
}

function deny(req, res, next, status, messageKey) {
  if (isApi(req)) {
    return res.status(status).json({
      message: req.__(messageKey),
      data: null
    });
  }

  return next(createError(status));
}

function authorize(resource, action, possession, options = {}) {
  return async function authorizationMiddleware(req, res, next) {
    try {
      if (!req.user) {
        return deny(req, res, next, 401, 'common.unauthorized');
      }

      const roleId = req.user.role_id;

      if (!roleId) {
        return deny(req, res, next, 403, 'common.forbidden');
      }

      const role = await Role.findByPk(roleId, {
        include: {
          model: Permission,
          as: 'permissions',
          attributes: ['key'],
          through: { attributes: [] }
        }
      });

      if (!role) {
        return deny(req, res, next, 403, 'common.forbidden');
      }

      const accessControl = new AccessControl();
      const grant = accessControl.grant(String(role.id));

      for (const item of role.permissions || []) {
        const parsed = parsePermissionKey(item.key);

        if (!parsed) continue;

        const method =
          parsed.action +
          parsed.possession[0].toUpperCase() +
          parsed.possession.slice(1);

        grant[method](parsed.resource);
      }

      const access = accessControl.can(String(role.id));

      res.locals.can = (resource, action, possession) => {
        if (!['create', 'read', 'update', 'delete'].includes(action)) {
          return false;
        }

        if (!['own', 'any'].includes(possession)) {
          return false;
        }

        const method = action +
          possession[0].toUpperCase() +
          possession.slice(1);

        return access[method](resource).granted;
      };

      const anyPermission = access[
        action + 'Any'
      ](resource).granted;

      const ownPermission = access[
        action + 'Own'
      ](resource).granted;

      let ownershipRequired = false;

      if (possession === 'ownOrAny') {
        if (anyPermission) {
          ownershipRequired = false;
        } else if (ownPermission) {
          ownershipRequired = true;
        } else {
          return deny(req, res, next, 403, 'common.forbidden');
        }
      } else if (possession === 'any') {
        if (!anyPermission) {
          return deny(req, res, next, 403, 'common.forbidden');
        }
      } else if (possession === 'own') {
        if (!ownPermission) {
          return deny(req, res, next, 403, 'common.forbidden');
        }

        ownershipRequired = true;
      }

      req.permission = {
        resource,
        action,
        possession: ownershipRequired ? 'own' : 'any'
      };

      const checkoutOwnOrder = options.checkout === true && !isApi(req) && resource === 'orders' && action === 'create';

        if (ownershipRequired && resource === 'orders' && !checkoutOwnOrder) {
          if (action === 'read' && !req.params.id) {
            const customers = await Customer.find({
              userId: req.user.id
            }).select('_id');

            req.ownershipFilter = {
              customerId: { $in: customers.map(customer => customer._id) }
            };
          } else {
            const ownsOrder = await checkOrderOwnership(req);

            if (ownsOrder === null) {
              return deny(req, res, next, 404, 'common.notFound');
            }

            if (!ownsOrder) {
              return deny(req, res, next, 403, 'common.forbidden');
            }
          }
      }

      if (ownershipRequired && resource === 'customers') {
  if (action === 'read' && !req.params.id) {
    req.ownershipFilter = { userId: req.user.id };
  } else if (action !== 'create') {
    const ownsCustomer = await checkCustomerOwnership(req);

    if (ownsCustomer === null) {
      return deny(req, res, next, 404, 'common.notFound');
    }

    if (!ownsCustomer) {
      return deny(req, res, next, 403, 'common.forbidden');
    }
  }
}

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = authorize;