
const { User, Role } = require('../models/sql');
const { hashPassword } = require('../utils/passwords');
const { Buffer } = require('node:buffer');

const {
  readBody,
  checkTypes,
  checkIds
} = require('../utils/validation');

const allowedFields = [
  'name',
  'lastName',
  'email',
  'roleId',
  'password',
  'active'
];

class UserServiceError extends Error {
  constructor(status, messageKey, field = null) {
    super(messageKey);
    this.name = 'UserServiceError';
    this.status = status;
    this.messageKey = messageKey;
    this.field = field;
  }
}

// Nunca devolver contrasenas, hashes ni salts
function safeUser(user) {
  if (!user) return null;

  const data = typeof user.toJSON === 'function'
    ? user.toJSON()
    : { ...user };

  delete data.password;
  delete data.password_hash;
  delete data.salt_key;

  return data;
}

// Validacion compartida entre API y SSR
function readUserBody(body, creating = false) {
  const required = creating
    ? ['name', 'lastName', 'email', 'roleId', 'password']
    : [];

  const data = readBody(
    body,
    allowedFields,
    required
  );

  checkTypes(data, ['name', 'lastName', 'email'], 'string');
  checkTypes(data, ['active'], 'boolean');
  checkIds(data, ['roleId']);

  return data;
}

// Convertir los campos al formato de PostgreSQL
function userChanges(data) {
  const changes = {};

  if (Object.hasOwn(data, 'name')) {
    changes.first_name = data.name.trim();
  }

  if (Object.hasOwn(data, 'lastName')) {
    changes.last_name = data.lastName.trim();
  }

  if (Object.hasOwn(data, 'email')) {
    changes.email = data.email.trim();
  }

  if (Object.hasOwn(data, 'roleId')) {
    changes.role_id = data.roleId;
  }

  if (Object.hasOwn(data, 'active')) {
    changes.active = data.active;
  }

  return changes;
}

// Validar contrasena antes de utilizar bcrypt
function validatePassword(password) {
  if (typeof password !== 'string' || !password) {
    throw new UserServiceError(
      400,
      'users.passwordRequired',
      'password'
    );
  }

  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new UserServiceError(
      400,
      'users.passwordTooLong',
      'password'
    );
  }
}

// Validar nombres y correo
function validateChanges(changes) {
  for (const [column, field] of [
    ['first_name', 'name'],
    ['last_name', 'lastName']
  ]) {
    if (
      Object.hasOwn(changes, column) &&
      (!changes[column] || changes[column].length > 100)
    ) {
      throw new UserServiceError(
        400,
        'ssr.adminUsers.invalidName',
        field
      );
    }
  }

  if (
    Object.hasOwn(changes, 'email') &&
    (
      changes.email.length > 150 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(changes.email)
    )
  ) {
    throw new UserServiceError(
      400,
      'users.invalidEmail',
      'email'
    );
  }
}

// Listar usuarios incluyendo su rol
async function listUsers() {
  const users = await User.findAll({
    attributes: {
      exclude: ['password_hash', 'salt_key']
    },
    include: {
      model: Role,
      as: 'role'
    },
    order: [['id', 'ASC']]
  });

  return users.map(safeUser);
}

// Consultar usuario por ID
async function findById(id) {
  const user = await User.findByPk(id, {
    attributes: {
      exclude: ['password_hash', 'salt_key']
    },
    include: {
      model: Role,
      as: 'role'
    }
  });

  return safeUser(user);
}

// Obtener roles para el formulario
async function listRoles() {
  return Role.findAll({
    attributes: ['id', 'name', 'description'],
    order: [['name', 'ASC']]
  });
}

// Crear usuario
async function createUser(body) {
  const data = readUserBody(body, true);
  const changes = userChanges(data);

  validatePassword(data.password);

  if (!changes.email) {
    throw new UserServiceError(
      400,
      'users.emailRequired',
      'email'
    );
  }

  validateChanges(changes);

  if (!(await Role.findByPk(data.roleId))) {
    throw new UserServiceError(
      400,
      'users.invalidRole',
      'roleId'
    );
  }

  Object.assign(
    changes,
    await hashPassword(data.password)
  );

  const user = await User.create(changes);

  return safeUser(user);
}

// Actualizar usuario
async function updateUser(id, body, actorId = null) {
  const data = readUserBody(body);
  const changes = userChanges(data);

  validateChanges(changes);

  if (Object.hasOwn(data, 'password')) {
    validatePassword(data.password);
  }

  const user = await User.findByPk(id);

  if (!user) {
    return null;
  }

  // Evitar que un administrador pierda su propio acceso
  if (
    actorId !== null &&
    Number(actorId) === Number(id) &&
    (
      changes.active === false ||
      (
        Object.hasOwn(changes, 'role_id') &&
        Number(changes.role_id) !== Number(user.role_id)
      )
    )
  ) {
    throw new UserServiceError(
      400,
      'ssr.adminUsers.selfProtected'
    );
  }

  if (
    Object.hasOwn(data, 'roleId') &&
    !(await Role.findByPk(data.roleId))
  ) {
    throw new UserServiceError(
      400,
      'users.invalidRole',
      'roleId'
    );
  }

  if (Object.hasOwn(data, 'password')) {
    Object.assign(
      changes,
      await hashPassword(data.password)
    );
  }

  await user.update(changes);

  return safeUser(user);
}

// Eliminar usuario: operacion existente de la API
async function deleteUser(id, actorId = null) {

  if (
    actorId !== null &&
    Number(actorId) === Number(id)
  ) {
    throw new UserServiceError(
      400,
      'ssr.adminUsers.selfProtected'
    );
  }

  const user = await User.findByPk(id);

  if (!user) {
    return null;
  }

  await user.destroy();

  return safeUser(user);
}

module.exports = {
  UserServiceError,
  listUsers,
  findById,
  listRoles,
  createUser,
  updateUser,
  deleteUser
};