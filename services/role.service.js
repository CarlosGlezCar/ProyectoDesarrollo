const createError = require('http-errors');

const {
  Role,
  Permission,
  sequelize
} = require('../models/sql');

const { readIdList } = require('../utils/validation');

const permissionsInclude = {
  model: Permission,
  as: 'permissions',
  through: { attributes: [] }
};

class RoleServiceError extends Error {
  constructor(status, messageKey) {
    super(messageKey);
    this.name = 'RoleServiceError';
    this.status = status;
    this.messageKey = messageKey;
  }
}

// Listar roles con sus permisos
async function listRoles() {
  return Role.findAll({
    include: permissionsInclude
  });
}

// Consultar un rol
async function findById(id) {
  return Role.findByPk(id, {
    include: permissionsInclude
  });
}

// Listar todos los permisos disponibles
async function listPermissions() {
  return Permission.findAll();
}

// Validar que todos los permisos existan
async function checkPermissions(ids, transaction) {
  if (ids === undefined || ids.length === 0) {
    return;
  }

  const permissions = await Permission.findAll({
    attributes: ['id'],
    where: { id: ids },
    transaction
  });

  if (permissions.length !== ids.length) {
    throw createError(400);
  }
}

// Crear rol: reutilizado por la API
async function createRole(changes, ids) {
  return sequelize.transaction(async transaction => {
    await checkPermissions(ids, transaction);

    const role = await Role.create(changes, {
      transaction
    });

    if (ids !== undefined) {
      await role.setPermissions(ids, {
        transaction
      });
    }

    return role.reload({
      include: permissionsInclude,
      transaction
    });
  });
}

// Actualizar rol y permisos
async function updateRole(
  id,
  changes = {},
  permissionIds,
  actorRoleId = null
) {
  const ids = permissionIds === undefined
    ? undefined
    : readIdList(permissionIds);

  return sequelize.transaction(async transaction => {

    const role = await Role.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!role) {
      return null;
    }

    await checkPermissions(ids, transaction);

    // Proteger los permisos del propio rol
    if (
      ids !== undefined &&
      actorRoleId !== null &&
      Number(actorRoleId) === Number(id)
    ) {
      const current = await role.getPermissions({
        attributes: ['id'],
        transaction
      });

      const selected = new Set(ids);

      if (current.some(p => !selected.has(Number(p.id)))) {
        throw new RoleServiceError(
          400,
          'ssr.adminRoles.selfProtected'
        );
      }
    }

    if (Object.keys(changes).length > 0) {
      await role.update(changes, {
        transaction
      });
    }

    if (ids !== undefined) {
      await role.setPermissions(ids, {
        transaction
      });
    }

    return role.reload({
      include: permissionsInclude,
      transaction
    });
  });
}

// Actualizar exclusivamente los permisos
async function updatePermissions(id, ids, actorRoleId) {
  return updateRole(id, {}, ids, actorRoleId);
}

// Eliminar rol: operacion existente de la API
async function deleteRole(id) {
  const role = await findById(id);

  if (!role) {
    return null;
  }

  await role.destroy();

  return role;
}

async function createPermission(data) {
  return Permission.create(data);
}

async function findPermissionById(id) {
  return Permission.findByPk(id);
}

async function updatePermission(id, data) {
  const permission = await findPermissionById(id);
  if (!permission) return null;
  await permission.update(data);
  return permission;
}

async function deletePermission(id) {
  const permission = await findPermissionById(id);
  if (!permission) return null;
  await permission.destroy();
  return permission;
}

module.exports = {
  createPermission,
  findPermissionById,
  updatePermission,
  deletePermission,
  RoleServiceError,
  listRoles,
  findById,
  listPermissions,
  createRole,
  updateRole,
  updatePermissions,
  deleteRole
};
