const Permission = require('../models/relationals/Permission');

async function create(req, res, next) {
  try {
    const { key, description } = req.body || {};
    if (typeof key !== 'string' || !key.trim()) {
      return res.status(400).json({ message: req.__('permissions.keyRequired'), data: null });
    }
    if (!/^[a-z][a-z0-9_-]*:(create|read|update|delete):(own|any)$/.test(key)) {
      return res.status(400).json({ message: req.__('permissions.invalidKey'), data: null });
    }
    const permission = await Permission.create({ key, description });
    return res.status(201).json({ message: req.__('permissions.created'), data: permission });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const permissions = await Permission.findAll();
    return res.json({ message: req.__('permissions.list'), data: permissions });
  } catch (err) {
    return next(err);
  }
}

async function find(req, res, next) {
  try {
    const permission = await Permission.findByPk(req.params.id);
    if (!permission) {
      return res.status(404).json({ message: req.__('permissions.notFound'), data: null });
    }
    return res.json({ message: req.__('permissions.found'), data: permission });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const permission = await Permission.findByPk(req.params.id);
    if (!permission) {
      return res.status(404).json({ message: req.__('permissions.notFound'), data: null });
    }
    const { key, description } = req.body || {};
    if (key !== undefined &&
        (typeof key !== 'string' ||
         !/^[a-z][a-z0-9_-]*:(create|read|update|delete):(own|any)$/.test(key))) {
      return res.status(400).json({ message: req.__('permissions.invalidKey'), data: null });
    }
    await permission.update({
      key: key ?? permission.key,
      description: description ?? permission.description
    });
    return res.json({ message: req.__('permissions.updated'), data: permission });
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  try {
    const permission = await Permission.findByPk(req.params.id);
    if (!permission) {
      return res.status(404).json({ message: req.__('permissions.notFound'), data: null });
    }
    await permission.destroy();
    return res.json({ message: req.__('permissions.deleted'), data: permission });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, find, update, destroy, create };
