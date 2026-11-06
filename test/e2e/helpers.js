const request = require('supertest');
const config = require('config');
const baseUrl = process.env.E2E_BASE_URL || config.get('e2e.baseUrl');

const CREDENTIALS = {
  ADMIN: { email: 'admin@strideco.test', password: 'Admin123!' },
  SALES: { email: 'ventas@strideco.test', password: 'Ventas123!' },
  USER: { email: 'usuario@strideco.test', password: 'Usuario123!' }
};

function api() {
  return request(baseUrl);
}

async function login(role) {
  const credentials = CREDENTIALS[role];

  if (!credentials) {
    throw new Error(`Rol desconocido: ${role}`);
  }

  const response = await api().post('/api/auth/login').send(credentials);

  if (response.statusCode !== 200) {
    throw new Error(
      `Login de ${role} falló con código ${response.statusCode}. ` +
      '¿Está corriendo la API y se ejecutó npm run seed?'
    );
  }

  return response.body.data.token;
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { api, login, bearer, CREDENTIALS, baseUrl };