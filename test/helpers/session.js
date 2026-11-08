const jwt = require('jsonwebtoken');
const config = require('config');
const { User, Role } = require('../../models/sql');

// Firma un JWT válido con la configuración de pruebas (config/test.json)
function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, config.get('jwt.secret'), {
    algorithm: 'HS256',
    expiresIn: '5m',
    issuer: config.get('jwt.issuer'),
    audience: config.get('jwt.audience')
  });
}

// Simula un usuario autenticado con ciertos permisos, sin base de datos.
// Devuelve el encabezado Authorization listo para usar.
function mockSession({ userId = 1, roleId = 1, permissions = [] } = {}) {
  jest.spyOn(User, 'findByPk').mockResolvedValue({
    id: userId,
    role_id: roleId,
    active: true
  });
  jest.spyOn(Role, 'findByPk').mockResolvedValue({
    id: roleId,
    permissions: permissions.map(key => ({ key }))
  });

  return { Authorization: `Bearer ${signToken(userId)}` };
}

module.exports = { signToken, mockSession };