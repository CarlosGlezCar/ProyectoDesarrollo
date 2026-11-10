const { User, Role } = require('../models/sql');
const { hashPassword } = require('../utils/passwords');
const { Buffer } = require('node:buffer');
const { isSqlId, readBody, checkTypes, checkIds } = require('../utils/validation');

const allowedFields = ['name', 'lastName', 'email', 'roleId', 'password', 'active'];

function readUserBody(body, creating = false) {
  const required = creating ? ['name', 'lastName', 'email', 'roleId', 'password'] : [];
  const data = readBody(body, allowedFields, required);
  checkTypes(data, ['name', 'lastName', 'email'], 'string');
  checkTypes(data, ['active'], 'boolean');
  checkIds(data, ['roleId']);
  return data;
}

function userChanges(data) {
  const changes = {};
  if (Object.hasOwn(data, 'name')) changes.first_name = data.name.trim();
  if (Object.hasOwn(data, 'lastName')) changes.last_name = data.lastName.trim();
  if (Object.hasOwn(data, 'email')) changes.email = data.email.trim();
  if (Object.hasOwn(data, 'roleId')) changes.role_id = data.roleId;
  if (Object.hasOwn(data, 'active')) changes.active = data.active;
  return changes;
}

function validId(req, res) {
  if (isSqlId(req.params.id)) return true;
  res.status(400).json({ message: req.__('common.invalidId'), data: null });
  return false;
}

function safeUser(user) {
  if (!user) return null;
  const data = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
  delete data.password;
  delete data.password_hash;
  delete data.salt_key;
  return data;
}

function passwordError(password, req) {
  if (typeof password !== 'string' || !password) {
    return req.__('users.passwordRequired');
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return req.__('users.passwordTooLong');
  }
  return null;
}

async function create(req, res, next) {
  try {
    const data = readUserBody(req.body, true);
    const changes = userChanges(data);
    const error = passwordError(data.password, req);
    if (error) return res.status(400).json({ message: error, data: null });

    if (!changes.email) {
      return res.status(400).json({ message: req.__('users.emailRequired'), data: null });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(changes.email)) {
      return res.status(400).json({ message: req.__('users.invalidEmail'), data: null });
    }
    if (!(await Role.findByPk(data.roleId))) {
      return res.status(400).json({ message: req.__('users.invalidRole'), data: null });
    }

    Object.assign(changes, await hashPassword(data.password));
    const user = await User.create(changes);
    return res.status(201).json({
      message: req.__('users.created'),
      data: safeUser(user)
    });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const users = await User.findAll({
      include: { model: Role, as: 'role' }
    });
    return res.json({
      message: req.__('users.list'),
      data: users.map(safeUser)
    });
  } catch (err) {
    return next(err);
  }
}

async function find(req, res, next) {
  try {
    if (!validId(req, res)) return;
    const user = await User.findByPk(Number(req.params.id), {
      include: { model: Role, as: 'role' }
    });
    if (!user) {
      return res.status(404).json({
        message: req.__('users.notFound'), data: null
      });
    }
    return res.json({
      message: req.__('users.found'),
      data: safeUser(user)
    });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    if (!validId(req, res)) return;
    const data = readUserBody(req.body);
    const changes = userChanges(data);

    if (Object.hasOwn(data, 'email') &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(changes.email)) {
      return res.status(400).json({
        message: req.__('users.invalidEmail'), data: null
      });
    }
    if (Object.hasOwn(data, 'password')) {
      const error = passwordError(data.password, req);
      if (error) return res.status(400).json({ message: error, data: null });
    }

    const user = await User.findByPk(Number(req.params.id));
    if (!user) {
      return res.status(404).json({
        message: req.__('users.notFound'), data: null
      });
    }
    if (Object.hasOwn(data, 'roleId') && !(await Role.findByPk(data.roleId))) {
      return res.status(400).json({
        message: req.__('users.invalidRole'), data: null
      });
    }
    if (Object.hasOwn(data, 'password')) {
      Object.assign(changes, await hashPassword(data.password));
    }

    await user.update(changes);
    return res.json({
      message: req.__('users.updated'),
      data: safeUser(user)
    });
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  try {
    if (!validId(req, res)) return;
    const user = await User.findByPk(Number(req.params.id));
    if (!user) {
      return res.status(404).json({
        message: req.__('users.notFound'), data: null
      });
    }
    await user.destroy();
    return res.json({
      message: req.__('users.deleted'),
      data: safeUser(user)
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, create, find, update, destroy };