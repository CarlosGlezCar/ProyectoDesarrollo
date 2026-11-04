const { AccessControl } = require('accesscontrol');
const { Role, Permission } = require('../models/relationals');
const { Order, Customer } = require('../models/documents');

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
        const customerId = req.body.customerId;

        if (!customerId) {
            return false;
        }

        const customer = await Customer.findById(customerId);

        return Boolean(
            customer &&
            String(customer.userId) === String(req.user.id)
        );
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
        return null;
    }

    const customer = await Customer.findById(order.customerId);

    return Boolean(
        customer &&
        String(customer.userId) === String(req.user.id)
    );
}

function authorize(resource, action, possession) {
    return async function authorizationMiddleware(req, res, next) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    message: 'Unauthorized'
                });
            }

            const roleId = req.user.role_id;

            if (!roleId) {
                return res.status(403).json({
                    message: 'Forbidden'
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
                    message: 'Forbidden'
                });
            }

            const accessControl = new AccessControl();
            const grant = accessControl.grant(String(role.id));

            for (const item of role.permissions) {
                const parsed = parsePermissionKey(item.key);

                if (!parsed) {
                    continue;
                }

                const method =
                    parsed.action +
                    parsed.possession[0].toUpperCase() +
                    parsed.possession.slice(1);

                grant[method](parsed.resource);
            }

            const access = accessControl.can(String(role.id));
            let granted = false;
            let ownershipRequired = false;

            if (possession === 'ownOrAny') {
                const ownPermission = access.readOwn(resource);
                const anyPermission = access.readAny(resource);

                if (anyPermission.granted) {
                    granted = true;
                } else if (ownPermission.granted) {
                    granted = true;
                    ownershipRequired = true;
                }
            } else {
                const method =
                    action +
                    possession[0].toUpperCase() +
                    possession.slice(1);

                granted = access[method](resource).granted;
                ownershipRequired = possession === 'own';
            }

            if (!granted) {
                return res.status(403).json({
                    message: 'Forbidden'
                });
            }

            req.permission = {
                resource,
                action,
                possession: ownershipRequired ? 'own' : 'any'
            };

            if (ownershipRequired && resource === 'orders') {
                const ownsOrder = await checkOrderOwnership(req);

                if (ownsOrder === null) {
                    return res.status(404).json({
                        message: 'Order not found'
                    });
                }

                if (!ownsOrder) {
                    return res.status(403).json({
                        message: 'Forbidden'
                    });
                }
            }

            return next();
        } catch (error) {
            return next(error);
        }
    };
}

module.exports = authorize;