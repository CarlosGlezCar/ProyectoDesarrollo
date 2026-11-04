const { Role, Permission } = require('../models/relationals');

async function create(req, res, next) {
  try {
    const { name, permissionIds, permissions } = req.body || {};
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: req.__('roles.nameRequired'), data: null });
    }
    const role = await Role.create(req.body);
    const ids = permissionIds ?? permissions;
    if (ids !== undefined) await role.setPermissions(ids);
    return res.status(201).json({ message: req.__('roles.created'), data: role });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const roles = await Role.findAll({
      include: { model: Permission, as: 'permissions' }
    });
    return res.json({ message: req.__('roles.list'), data: roles });
  } catch (err) {
    return next(err);
  }
}

async function find(req, res, next) {
  try {
    const role = await Role.findByPk(req.params.id, {
      include: { model: Permission, as: 'permissions' }
    });
    if (!role) {
      return res.status(404).json({ message: req.__('roles.notFound'), data: null });
    }
    return res.json({ message: req.__('roles.found'), data: role });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ message: req.__('roles.notFound'), data: null });
    }
    const { name, description, permissionIds, permissions } = req.body || {};
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ message: req.__('roles.nameRequired'), data: null });
    }
    await role.update({
      name: name ?? role.name,
      description: description ?? role.description
    });
    const ids = permissionIds ?? permissions;
    if (ids !== undefined) await role.setPermissions(ids);
    const updatedRole = await Role.findByPk(req.params.id, {
      include: { model: Permission, as: 'permissions' }
    });
    return res.json({ message: req.__('roles.updated'), data: updatedRole });
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ message: req.__('roles.notFound'), data: null });
    }
    await role.destroy();
    return res.json({ message: req.__('roles.deleted'), data: role });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, find, update, create, destroy };
