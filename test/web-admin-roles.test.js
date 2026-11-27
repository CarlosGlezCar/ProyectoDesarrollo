
const request = require('supertest');
const app = require('../app');

const roleService = require('../services/role.service');
const { mockSession } = require('./helpers/session');

const grantedPermissions = [
  'roles:read:any',
  'roles:update:any'
];

const permissions = [
  {
    id: 1,
    key: 'products:read:any'
  },
  {
    id: 2,
    key: 'customers:read:any'
  },
  {
    id: 3,
    key: 'orders:read:own'
  }
];

const sampleRole = {
  id: 2,
  name: 'SALES',
  description: 'Gestion comercial',
  permissions: [permissions[0], permissions[1]]
};

function sessionCookie(granted = grantedPermissions) {
  const headers = mockSession({
    userId: 1,
    roleId: 1,
    permissions: granted
  });

  const token = headers.Authorization.replace(
    /^Bearer\s+/i,
    ''
  );

  return `access_token=${token}`;
}

beforeEach(() => {
  jest.spyOn(roleService, 'listRoles')
    .mockResolvedValue([sampleRole]);

  jest.spyOn(roleService, 'findById')
    .mockResolvedValue(sampleRole);

  jest.spyOn(roleService, 'listPermissions')
    .mockResolvedValue(permissions);

  jest.spyOn(roleService, 'updatePermissions')
    .mockResolvedValue(sampleRole);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('F14 - Roles y permisos SSR', () => {

  test('Renderiza listado de roles', async () => {
    const response = await request(app)
      .get('/admin/roles?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.headers['content-type'])
      .toContain('text/html');

    expect(response.text)
      .toContain('Roles y permisos');

    expect(response.text)
      .toContain('SALES');
  });

  test('Muestra el editor de permisos', async () => {
    const response = await request(app)
      .get('/admin/roles/2/edit?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('products:read:any');

    expect(response.text)
      .toContain('orders:read:own');

    expect(response.text)
      .toContain('type="checkbox"');

    expect(response.text)
      .toMatch(/id="permission-1"[^>]*checked/);
  });

  test('Redirige al login sin sesion', async () => {
    const response = await request(app)
      .get('/admin/roles');

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toContain('/login');
  });

  test('Rechaza listado sin permiso', async () => {
    await request(app)
      .get('/admin/roles')
      .set('Cookie', sessionCookie([]))
      .expect(403);
  });

  test('Impide editar sin permiso de escritura', async () => {
    await request(app)
      .get('/admin/roles/2/edit')
      .set('Cookie', sessionCookie([
        'roles:read:any'
      ]))
      .expect(403);
  });

  test('Actualiza permisos mediante PRG', async () => {
    const response = await request(app)
      .post('/admin/roles/2')
      .set('Cookie', sessionCookie())
      .type('form')
      .send('permissionsSubmitted=1&permissionIds=1&permissionIds=3');

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toBe('/admin/roles');

    expect(roleService.updatePermissions)
      .toHaveBeenCalledWith(
        2,
        [1, 3],
        1
      );
  });

  test('Acepta una sola casilla seleccionada', async () => {
    await request(app)
      .post('/admin/roles/2')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        permissionsSubmitted: '1',
        permissionIds: '1'
      })
      .expect(302);

    expect(roleService.updatePermissions)
      .toHaveBeenCalledWith(2, [1], 1);
  });

  test('Acepta un formulario sin casillas seleccionadas', async () => {
    await request(app)
      .post('/admin/roles/2')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        permissionsSubmitted: '1'
      })
      .expect(302);

    expect(roleService.updatePermissions)
      .toHaveBeenCalledWith(2, [], 1);
  });

  test('Rechaza identificadores de permisos invalidos', async () => {
    await request(app)
      .post('/admin/roles/2')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        permissionsSubmitted: '1',
        permissionIds: 'abc'
      })
      .expect(400);

    expect(roleService.updatePermissions)
      .not.toHaveBeenCalled();
  });

  test('Rechaza formularios incompletos', async () => {
    await request(app)
      .post('/admin/roles/2')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        permissionIds: '1'
      })
      .expect(400);

    expect(roleService.updatePermissions)
      .not.toHaveBeenCalled();
  });

  test('Impide modificar permisos sin autorizacion', async () => {
    await request(app)
      .post('/admin/roles/2')
      .set('Cookie', sessionCookie([
        'roles:read:any'
      ]))
      .type('form')
      .send({
        permissionsSubmitted: '1',
        permissionIds: '1'
      })
      .expect(403);

    expect(roleService.updatePermissions)
      .not.toHaveBeenCalled();
  });

  test('Devuelve 404 cuando el rol no existe', async () => {
    roleService.findById.mockResolvedValue(null);

    await request(app)
      .get('/admin/roles/999/edit')
      .set('Cookie', sessionCookie())
      .expect(404);
  });

  test('Muestra errores de proteccion del propio rol', async () => {
    roleService.updatePermissions.mockRejectedValue(
      new roleService.RoleServiceError(
        400,
        'ssr.adminRoles.selfProtected'
      )
    );

    const response = await request(app)
      .post('/admin/roles/2?lang=es')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        permissionsSubmitted: '1'
      });

    expect(response.status).toBe(400);

    expect(response.text)
      .toContain('No puedes retirar permisos de tu propio rol.');
  });

  test('Oculta la edicion si solo tiene lectura', async () => {
    const response = await request(app)
      .get('/admin/roles')
      .set('Cookie', sessionCookie([
        'roles:read:any'
      ]));

    expect(response.status).toBe(200);

    expect(response.text)
      .not.toContain('/admin/roles/2/edit');
  });

  test('Renderiza el editor en ingles', async () => {
    const response = await request(app)
      .get('/admin/roles/2/edit?lang=en')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Edit role permissions');
  });

  test('Muestra el listado vacio', async () => {
    roleService.listRoles.mockResolvedValue([]);

    const response = await request(app)
      .get('/admin/roles?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('No hay roles registrados.');
  });

  test('No muestra informacion sensible', async () => {
    const response = await request(app)
      .get('/admin/roles/2/edit')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .not.toContain('password_hash');

    expect(response.text)
      .not.toContain('salt_key');
  });

});
