const Permission = require('../models/sql/Permission');
const { isSqlId, readBody, checkTypes } = require('../utils/validation');

const keyPattern = /^[a-z][a-z0-9_-]*:(create|read|update|delete):(own|any)$/;

function readPermissionBody(body, creating = false) {
  const fields = ['key', 'description'];
  const data = readBody(body, fields, creating ? fields : []);
  checkTypes(data, fields, 'string');

  if (Object.hasOwn(data, 'key')) data.key = data.key.trim();
  if (Object.hasOwn(data, 'description')) {
    data.description = data.description.trim();
  }

  return data;
}

function validId(req, res) {
  if (isSqlId(req.params.id)) return true;
  res.status(400).json({
    message: req.__('common.invalidId'), data: null
  });
  return false;
}

async function create(req, res, next) {
  try {
    const data = readPermissionBody(req.body, true);

    if (!data.key) {
      return res.status(400).json({
        message: req.__('permissions.keyRequired'), data: null
      });
    }
    if (!keyPattern.test(data.key)) {
      return res.status(400).json({
        message: req.__('permissions.invalidKey'), data: null
      });
    }

    const permission = await Permission.create(data);
    return res.status(201).json({
      message: req.__('permissions.created'), data: permission
    });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const permissions = await Permission.findAll();
    return res.json({
      message: req.__('permissions.list'), data: permissions
    });
  } catch (err) {
    return next(err);
  }
}

async function find(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const permission = await Permission.findByPk(Number(req.params.id));
    if (!permission) {
      return res.status(404).json({
        message: req.__('permissions.notFound'), data: null
      });
    }

    return res.json({
      message: req.__('permissions.found'), data: permission
    });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    if (!validId(req, res)) return;
    const data = readPermissionBody(req.body);

    if (Object.hasOwn(data, 'key') && !keyPattern.test(data.key)) {
      return res.status(400).json({
        message: req.__('permissions.invalidKey'), data: null
      });
    }

    const permission = await Permission.findByPk(Number(req.params.id));
    if (!permission) {
      return res.status(404).json({
        message: req.__('permissions.notFound'), data: null
      });
    }

    await permission.update(data);
    return res.json({
      message: req.__('permissions.updated'), data: permission
    });
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const permission = await Permission.findByPk(Number(req.params.id));
    if (!permission) {
      return res.status(404).json({
        message: req.__('permissions.notFound'), data: null
      });
    }

    await permission.destroy();
    return res.json({
      message: req.__('permissions.deleted'), data: permission
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, find, update, destroy, create };