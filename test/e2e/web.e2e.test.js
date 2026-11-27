
const request = require('supertest');

const {
  baseUrl,
  CREDENTIALS
} = require('./helpers');

describe('Entregable 3 - Vistas SSR E2E', () => {

  test('La tienda responde sin autenticacion', async () => {

    const response = await request(baseUrl)
      .get('/?lang=es');

    expect(response.status).toBe(200);

    expect(response.headers['content-type'])
      .toContain('text/html');

  });

  test('El login se renderiza en el servidor', async () => {

    const response = await request(baseUrl)
      .get('/login?lang=es');

    expect(response.status).toBe(200);

    expect(response.headers['content-type'])
      .toContain('text/html');

    expect(response.text)
      .toContain('name="email"');

    expect(response.text)
      .toContain('name="password"');

  });

  test('Redirige al login cuando no hay sesion', async () => {

    const response = await request(baseUrl)
      .get('/admin');

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toContain('/login');

  });

  test('Flujo completo de login, navegacion y logout', async () => {

    // Conserva las cookies entre peticiones
    const agent = request.agent(baseUrl);

    // Iniciar sesion
    const loginResponse = await agent
      .post('/login')
      .type('form')
      .send({
        ...CREDENTIALS.ADMIN,
        next: '/admin'
      });

    expect(loginResponse.status).toBe(302);

    expect(loginResponse.headers['set-cookie'].join(';'))
      .toContain('access_token=');

    expect(loginResponse.headers['set-cookie'].join(';'))
      .toContain('HttpOnly');

    // Abrir una pagina protegida
    const adminResponse = await agent
      .get('/admin?lang=es');

    expect(adminResponse.status).toBe(200);

    expect(adminResponse.headers['content-type'])
      .toContain('text/html');

    expect(adminResponse.text)
      .toContain('Pedidos recientes');

    expect(adminResponse.text)
      .not.toContain('password_hash');

    expect(adminResponse.text)
      .not.toContain('salt_key');

    // Cerrar sesion
    const logoutResponse = await agent
      .post('/logout')
      .type('form');

    expect(logoutResponse.status).toBe(302);

    // Comprobar que se elimino la sesion
    const protectedResponse = await agent
      .get('/admin');

    expect(protectedResponse.status).toBe(302);

    expect(protectedResponse.headers.location)
      .toContain('/login');

  });

  test('ADMIN puede acceder a todas las pantallas administrativas', async () => {

    const agent = request.agent(baseUrl);

    await agent
      .post('/login')
      .type('form')
      .send(CREDENTIALS.ADMIN)
      .expect(302);

    const routes = [
      '/admin',
      '/admin/products',
      '/admin/variants',
      '/admin/inventory',
      '/admin/orders',
      '/admin/customers',
      '/admin/users',
      '/admin/roles'
    ];

    for (const route of routes) {

      const response = await agent
        .get(route + '?lang=es');

      expect({
        route,
        status: response.status
      }).toEqual({
        route,
        status: 200
      });

      expect(response.headers['content-type'])
        .toContain('text/html');

      expect(response.text)
        .not.toContain('password_hash');

      expect(response.text)
        .not.toContain('salt_key');
    }

  });

  test('USER no puede acceder al panel administrativo', async () => {

    const agent = request.agent(baseUrl);

    await agent
      .post('/login')
      .type('form')
      .send(CREDENTIALS.USER)
      .expect(302);

    await agent
      .get('/admin')
      .expect(403);

    await agent
      .get('/admin/users')
      .expect(403);

    await agent
      .get('/admin/roles')
      .expect(403);

    // Si puede consultar sus pedidos
    await agent
      .get('/my/orders')
      .expect(200);

  });

  test('La pagina conserva el idioma seleccionado', async () => {

    const agent = request.agent(baseUrl);

    const english = await agent
      .get('/products?lang=en');

    expect(english.status).toBe(200);

    expect(english.text)
      .toContain('<html lang="en">');

    const nextPage = await agent.get('/');

    expect(nextPage.status).toBe(200);

    expect(nextPage.text)
      .toContain('<html lang="en">');

    const spanish = await agent
      .get('/products?lang=es');

    expect(spanish.status).toBe(200);

    expect(spanish.text)
      .toContain('<html lang="es">');

  });

  test('Un producto inexistente devuelve una pagina 404', async () => {

    const response = await request(baseUrl)
      .get('/products/2147483647');

    expect(response.status).toBe(404);

    expect(response.headers['content-type'])
      .toContain('text/html');

  });

});