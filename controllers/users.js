
const userService = require('../services/user.service');
const { isSqlId } = require('../utils/validation');

function validId(req, res) {
  if (isSqlId(req.params.id)) {
    return true;
  }

  res.status(400).json({
    message: req.__('common.invalidId'),
    data: null
  });

  return false;
}

function handleError(err, req, res, next) {
  if (err instanceof userService.UserServiceError) {
    return res.status(err.status).json({
      message: req.__(err.messageKey),
      data: null
    });
  }

  return next(err);
}

function notFound(req, res) {
  return res.status(404).json({
    message: req.__('users.notFound'),
    data: null
  });
}

async function list(req, res, next) {
  try {
    const users = await userService.listUsers();

    return res.json({
      message: req.__('users.list'),
      data: users
    });

  } catch (err) {
    return handleError(err, req, res, next);
  }
}

async function find(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const user = await userService.findById(
      Number(req.params.id)
    );

    if (!user) {
      return notFound(req, res);
    }

    return res.json({
      message: req.__('users.found'),
      data: user
    });

  } catch (err) {
    return handleError(err, req, res, next);
  }
}

async function create(req, res, next) {
  try {
    const user = await userService.createUser(req.body);

    return res.status(201).json({
      message: req.__('users.created'),
      data: user
    });

  } catch (err) {
    return handleError(err, req, res, next);
  }
}

async function update(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const user = await userService.updateUser(
      Number(req.params.id),
      req.body,
      req.user.id
    );

    if (!user) {
      return notFound(req, res);
    }

    return res.json({
      message: req.__('users.updated'),
      data: user
    });

  } catch (err) {
    return handleError(err, req, res, next);
  }
}

async function destroy(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const user = await userService.deleteUser(
      Number(req.params.id), req.user.id
    );

    if (!user) {
      return notFound(req, res);
    }

    return res.json({
      message: req.__('users.deleted'),
      data: user
    });

  } catch (err) {
    return handleError(err, req, res, next);
  }
}

module.exports = {
  list,
  find,
  create,
  update,
  destroy
};