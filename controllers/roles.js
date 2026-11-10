const createError = require('http-errors');
const { Role, Permission, sequelize } = require('../models/sql');
const { isSqlId, readBody, checkTypes, readIdList } = require('../utils/validation');

const permissionsInclude = {
  model: Permission,
  as: 'permissions',
  through: { attributes: [] }
};

function readRoleBody(body, creating = false) {
  const data = readBody(
    body,
    ['name', 'description', 'permissionIds', 'permissions'],
    creating ? ['name', 'description'] : []
  );
  checkTypes(data, ['name', 'description'], 'string');

  if (Object.hasOwn(data, 'permissionIds') && Object.hasOwn(data, 'permissions')) {
    throw createError(400);
  }

  const changes = {};
  if (Object.hasOwn(data, 'name')) changes.name = data.name.trim();
  if (Object.hasOwn(data, 'description')) changes.description = data.description.trim();

  let ids;
  if (Object.hasOwn(data, 'permissionIds')) ids = readIdList(data.permissionIds);
  if (Object.hasOwn(data, 'permissions')) ids = readIdList(data.permissions);

  return { changes, ids };
}

function validId(req, res) {
  if (isSqlId(req.params.id)) return true;
  res.status(400).json({ message: req.__('common.invalidId'), data: null });
  return false;
}

async function checkPermissions(ids, transaction) {
  if (ids === undefined || ids.length === 0) return;

  const permissions = await Permission.findAll({
    attributes: ['id'],
    where: { id: ids },
    transaction
  });
  if (permissions.length !== ids.length) throw createError(400);
}

async function create(req, res, next) {
  try {
    const { changes, ids } = readRoleBody(req.body, true);
    if (!changes.name) {
      return res.status(400).json({
        message: req.__('roles.nameRequired'), data: null
      });
    }

    const role = await sequelize.transaction(async transaction => {
      await checkPermissions(ids, transaction);
      const created = await Role.create(changes, { transaction });
      if (ids !== undefined) await created.setPermissions(ids, { transaction });
      return created.reload({ include: permissionsInclude, transaction });
    });

    return res.status(201).json({
      message: req.__('roles.created'), data: role
    });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const roles = await Role.findAll({ include: permissionsInclude });
    return res.json({
      message: req.__('roles.list'), data: roles
    });
  } catch (err) {
    return next(err);
  }
}

async function find(req, res, next) {
  try {
    if (!validId(req, res)) return;
    const role = await Role.findByPk(Number(req.params.id), {
      include: permissionsInclude
    });
    if (!role) {
      return res.status(404).json({
        message: req.__('roles.notFound'), data: null
      });
    }
    return res.json({
      message: req.__('roles.found'), data: role
    });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    if (!validId(req, res)) return;
    const { changes, ids } = readRoleBody(req.body);
    if (Object.hasOwn(changes, 'name') && !changes.name) {
      return res.status(400).json({
        message: req.__('roles.nameRequired'), data: null
      });
    }

    const role = await sequelize.transaction(async transaction => {
      const existing = await Role.findByPk(Number(req.params.id), {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!existing) return null;

      await checkPermissions(ids, transaction);
      if (Object.keys(changes).length > 0) {
        await existing.update(changes, { transaction });
      }
      if (ids !== undefined) await existing.setPermissions(ids, { transaction });
      return existing.reload({ include: permissionsInclude, transaction });
    });

    if (!role) {
      return res.status(404).json({
        message: req.__('roles.notFound'), data: null
      });
    }
    return res.json({
      message: req.__('roles.updated'), data: role
    });
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  try {
    if (!validId(req, res)) return;
    const role = await Role.findByPk(Number(req.params.id), {
      include: permissionsInclude
    });
    if (!role) {
      return res.status(404).json({
        message: req.__('roles.notFound'), data: null
      });
    }
    await role.destroy();
    return res.json({
      message: req.__('roles.deleted'), data: role
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, find, update, create, destroy };