
const createError = require('http-errors');
const { Buffer } = require('node:buffer');

const userService = require('../../services/user.service');
const { isSqlId } = require('../../utils/validation');

function getId(req) {
  if (!isSqlId(req.params.id)) {
    throw createError(404);
  }

  return Number(req.params.id);
}

// Leer solamente los campos permitidos
function readValues(body = {}) {
  const read = key =>
    typeof body[key] === 'string'
      ? body[key].trim()
      : '';

  return {
    name: read('name'),
    lastName: read('lastName'),
    email: read('email'),
    roleId: read('roleId')
  };
}

// Validar formulario
function validateValues(req, values, password, creating) {
  const errors = {};

  for (const field of ['name', 'lastName']) {
    if (!values[field] || values[field].length > 100) {
      errors[field] = req.__('ssr.adminUsers.invalidName');
    }
  }

  if (
    values.email.length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)
  ) {
    errors.email = req.__('users.invalidEmail');
  }

  if (!isSqlId(values.roleId)) {
    errors.roleId = req.__('users.invalidRole');
  }

  if (creating && !password) {
    errors.password = req.__('users.passwordRequired');
  } else if (Buffer.byteLength(password, 'utf8') > 72) {
    errors.password = req.__('users.passwordTooLong');
  } else if (password && password.length < 8) {
    errors.password = req.__('ssr.adminUsers.shortPassword');
  }

  return errors;
}

// Renderizar formulario sin conservar la contrasena
async function renderForm(req, res, {
  user = null,
  values = {},
  errors = {},
  status = 200
} = {}) {
  const roles = await userService.listRoles();

  const editing = Boolean(user);

  return res.status(status).render('admin/users/form', {
    title: req.__(
      editing
        ? 'ssr.adminUsers.editTitle'
        : 'ssr.adminUsers.newTitle'
    ),
    description: req.__('ssr.adminUsers.description'),
    user,
    roles,
    editing,
    values,
    errors
  });
}

function setFlash(req, res, key, type = 'success') {
  res.cookie('flash', JSON.stringify({
    type,
    message: req.__(key)
  }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.app.get('env') === 'production',
    maxAge: 60 * 1000,
    path: '/'
  });
}

// GET /admin/users
async function listUsers(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');

    const users = await userService.listUsers();

    return res.render('admin/users/index', {
      title: req.__('ssr.adminUsers.title'),
      description: req.__('ssr.adminUsers.description'),
      users
    });

  } catch (err) {
    return next(err);
  }
}

// GET /admin/users/new
async function newUser(req, res, next) {
  try {
    return await renderForm(req, res);
  } catch (err) {
    return next(err);
  }
}

// GET /admin/users/:id/edit
async function editUser(req, res, next) {
  try {
    const user = await userService.findById(getId(req));

    if (!user) {
      return next(createError(404));
    }

    return await renderForm(req, res, {
      user,
      values: {
        name: user.first_name,
        lastName: user.last_name,
        email: user.email,
        roleId: String(user.role_id)
      }
    });

  } catch (err) {
    return next(err);
  }
}

// Crear o actualizar usuario
async function saveUser(req, res, next, editing) {
  const values = readValues(req.body || {});

  const password = typeof req.body?.password === 'string'
    ? req.body.password
    : '';

  let user = null;

  try {
    if (editing) {
      user = await userService.findById(getId(req));

      if (!user) {
        return next(createError(404));
      }
    }

    const errors = validateValues(
      req,
      values,
      password,
      !editing
    );

    if (
      req.body?.password !== undefined &&
      typeof req.body.password !== 'string'
    ) {
      errors.password = req.__('common.invalidData');
    }

    if (Object.keys(errors).length) {
      return await renderForm(req, res, {
        user,
        values,
        errors,
        status: 400
      });
    }

    const data = {
      name: values.name,
      lastName: values.lastName,
      email: values.email,
      roleId: Number(values.roleId)
    };

    // Si esta vacia durante la edicion,
    // conservar la contrasena actual
    if (password) {
      data.password = password;
    }

    try {
      if (editing) {
        const updated = await userService.updateUser(
          user.id,
          data,
          req.user.id
        );

        if (!updated) {
          return next(createError(404));
        }

      } else {
        await userService.createUser(data);
      }

    } catch (err) {
      const formErrors = {};

      if (err instanceof userService.UserServiceError) {
        formErrors[err.field || 'general'] =
          req.__(err.messageKey);

      } else if (err.name === 'SequelizeUniqueConstraintError') {
        formErrors.email = req.__('users.emailExists');

      } else if (err.name === 'SequelizeForeignKeyConstraintError') {
        formErrors.roleId = req.__('users.invalidRole');

      } else if (err.name === 'SequelizeValidationError') {
        formErrors.general = req.__('common.invalidData');

      } else {
        throw err;
      }

      return await renderForm(req, res, {
        user,
        values,
        errors: formErrors,
        status: 400
      });
    }

    setFlash(
      req,
      res,
      editing
        ? 'users.updated'
        : 'users.created'
    );

    return res.redirect(302, '/admin/users');

  } catch (err) {
    return next(err);
  }
}

function createUser(req, res, next) {
  return saveUser(req, res, next, false);
}

function updateUser(req, res, next) {
  return saveUser(req, res, next, true);
}

// POST /admin/users/:id/status
async function changeStatus(req, res, next) {
  try {
    const id = getId(req);
    const active = req.body?.active;

    if (!['true', 'false'].includes(active)) {
      return next(createError(400));
    }

    const updated = await userService.updateUser(
      id,
      { active: active === 'true' },
      req.user.id
    );

    if (!updated) {
      return next(createError(404));
    }

    setFlash(
      req,
      res,
      active === 'true'
        ? 'ssr.adminUsers.activated'
        : 'ssr.adminUsers.deactivated'
    );

    return res.redirect(302, '/admin/users');

  } catch (err) {
    if (err instanceof userService.UserServiceError) {
      return next(createError(err.status));
    }

    return next(err);
  }
}

module.exports = {
  listUsers,
  newUser,
  editUser,
  createUser,
  updateUser,
  changeStatus
};
