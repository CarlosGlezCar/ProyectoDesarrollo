const { AccessControl } = require('accesscontrol');
const { Role, Permission } = require('../models/sql');
const { Order, Customer } = require('../models/mongo');

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

function authorize(resource, action, possession) {
  return async function authorizationMiddleware(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: req.__('common.unauthorized'),
          data: null
        });
      }

      const roleId = req.user.role_id;

      if (!roleId) {
        return res.status(403).json({
          message: req.__('common.forbidden'),
          data: null
        });
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
        return res.status(403).json({
          message: req.__('common.forbidden'),
          data: null
        });
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
          return res.status(403).json({
            message: req.__('common.forbidden'),
            data: null
          });
        }
      } else if (possession === 'any') {
        if (!anyPermission) {
          return res.status(403).json({
            message: req.__('common.forbidden'),
            data: null
          });
        }
      } else if (possession === 'own') {
        if (!ownPermission) {
          return res.status(403).json({
            message: req.__('common.forbidden'),
            data: null
          });
        }

        ownershipRequired = true;
      }

      req.permission = {
        resource,
        action,
        possession: ownershipRequired ? 'own' : 'any'
      };

      if (ownershipRequired && resource === 'orders') {
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
            return res.status(404).json({
              message: req.__('common.notFound'),
              data: null
            });
          }

          if (!ownsOrder) {
            return res.status(403).json({
              message: req.__('common.forbidden'),
              data: null
            });
          }
        }
      }

      if (ownershipRequired && resource === 'customers') {
  if (action === 'read' && !req.params.id) {
    req.ownershipFilter = { userId: req.user.id };
  } else if (action !== 'create') {
    const ownsCustomer = await checkCustomerOwnership(req);

    if (ownsCustomer === null) {
      return res.status(404).json({
        message: req.__('common.notFound'),
        data: null
      });
    }

    if (!ownsCustomer) {
      return res.status(403).json({
        message: req.__('common.forbidden'),
        data: null
      });
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