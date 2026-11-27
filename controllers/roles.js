
const createError = require('http-errors');
const roleService = require('../services/role.service');

const {
  isSqlId,
  readBody,
  checkTypes,
  readIdList
} = require('../utils/validation');

function readRoleBody(body, creating = false) {
  const data = readBody(
    body,
    ['name', 'description', 'permissionIds', 'permissions'],
    creating ? ['name', 'description'] : []
  );

  checkTypes(data, ['name', 'description'], 'string');

  if (
    Object.hasOwn(data, 'permissionIds') &&
    Object.hasOwn(data, 'permissions')
  ) {
    throw createError(400);
  }

  const changes = {};

  if (Object.hasOwn(data, 'name')) {
    changes.name = data.name.trim();
  }

  if (Object.hasOwn(data, 'description')) {
    changes.description = data.description.trim();
  }

  let ids;

  if (Object.hasOwn(data, 'permissionIds')) {
    ids = readIdList(data.permissionIds);
  }

  if (Object.hasOwn(data, 'permissions')) {
    ids = readIdList(data.permissions);
  }

  return { changes, ids };
}

function validId(req, res) {
  if (isSqlId(req.params.id)) return true;

  res.status(400).json({
    message: req.__('common.invalidId'),
    data: null
  });

  return false;
}

function notFound(req, res) {
  return res.status(404).json({
    message: req.__('roles.notFound'),
    data: null
  });
}

function handleError(err, req, res, next) {
  if (err instanceof roleService.RoleServiceError) {
    return res.status(err.status).json({
      message: req.__(err.messageKey),
      data: null
    });
  }

  return next(err);
}

async function create(req, res, next) {
  try {
    const { changes, ids } = readRoleBody(
      req.body,
      true
    );

    if (!changes.name) {
      return res.status(400).json({
        message: req.__('roles.nameRequired'),
        data: null
      });
    }

    const role = await roleService.createRole(
      changes,
      ids
    );

    return res.status(201).json({
      message: req.__('roles.created'),
      data: role
    });

  } catch (err) {
    return handleError(err, req, res, next);
  }
}

async function list(req, res, next) {
  try {
    const roles = await roleService.listRoles();

    return res.json({
      message: req.__('roles.list'),
      data: roles
    });

  } catch (err) {
    return next(err);
  }
}

async function find(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const role = await roleService.findById(
      Number(req.params.id)
    );

    if (!role) {
      return notFound(req, res);
    }

    return res.json({
      message: req.__('roles.found'),
      data: role
    });

  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const { changes, ids } = readRoleBody(req.body);

    if (
      Object.hasOwn(changes, 'name') &&
      !changes.name
    ) {
      return res.status(400).json({
        message: req.__('roles.nameRequired'),
        data: null
      });
    }

    const role = await roleService.updateRole(
      Number(req.params.id),
      changes,
      ids,
      req.user.role_id
    );

    if (!role) {
      return notFound(req, res);
    }

    return res.json({
      message: req.__('roles.updated'),
      data: role
    });

  } catch (err) {
    return handleError(err, req, res, next);
  }
}

async function destroy(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const role = await roleService.deleteRole(
      Number(req.params.id)
    );

    if (!role) {
      return notFound(req, res);
    }

    return res.json({
      message: req.__('roles.deleted'),
      data: role
    });

  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list,
  find,
  update,
  create,
  destroy
};
