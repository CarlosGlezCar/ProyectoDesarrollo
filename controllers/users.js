const { User, Role } = require('../models/sql');
const { hashPassword } = require('../utils/passwords');
const { Buffer } = require('node:buffer');

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
    const { name, lastName, email, roleId, password } = req.body || {};
    const error = passwordError(password, req);
    if (error) return res.status(400).json({ message: error, data: null });
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ message: req.__('users.emailRequired'), data: null });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: req.__('users.invalidEmail'), data: null });
    }
    if (roleId !== undefined && roleId !== null && !(await Role.findByPk(roleId))) {
      return res.status(400).json({ message: req.__('users.invalidRole'), data: null });
    }
    const { password_hash, salt_key } = await hashPassword(password);
    const user = await User.create({
      first_name: name,
      last_name: lastName,
      email: email.trim(),
      role_id: roleId,
      password_hash,
      salt_key
    });
    return res.status(201).json({ message: req.__('users.created'), data: safeUser(user) });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const users = await User.findAll({
      include: { model: Role, as: 'role' }
    });
    return res.json({ message: req.__('users.list'), data: users.map(safeUser) });
  } catch (err) {
    return next(err);
  }
}

async function find(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id, {
      include: { model: Role, as: 'role' }
    });
    if (!user) {
      return res.status(404).json({ message: req.__('users.notFound'), data: null });
    }
    return res.json({ message: req.__('users.found'), data: safeUser(user) });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: req.__('users.notFound'), data: null });
    }
    const { name, lastName, email, roleId, password } = req.body || {};
    if (email !== undefined &&
        (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) {
      return res.status(400).json({ message: req.__('users.invalidEmail'), data: null });
    }
    if (roleId !== undefined && roleId !== null && !(await Role.findByPk(roleId))) {
      return res.status(400).json({ message: req.__('users.invalidRole'), data: null });
    }
    const changes = {
      first_name: name ?? user.first_name,
      last_name: lastName ?? user.last_name,
      email: email?.trim() ?? user.email,
      role_id: roleId ?? user.role_id
    };
    if (password !== undefined) {
      const error = passwordError(password, req);
      if (error) return res.status(400).json({ message: error, data: null });
      const { password_hash, salt_key } = await hashPassword(password);
      changes.password_hash = password_hash;
      changes.salt_key = salt_key;
    }
    await user.update(changes);
    return res.json({ message: req.__('users.updated'), data: safeUser(user) });
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: req.__('users.notFound'), data: null });
    }
    await user.destroy();
    return res.json({ message: req.__('users.deleted'), data: safeUser(user) });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, create, find, update, destroy };
