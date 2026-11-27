
const request = require('supertest');
const app = require('../app');

const userService = require('../services/user.service');

const { UniqueConstraintError } = require('sequelize');
const { mockSession } = require('./helpers/session');

const permissions = [
  'users:read:any',
  'users:create:any',
  'users:update:any'
];

const roles = [
  { id: 1, name: 'ADMIN' },
  { id: 2, name: 'SALES' },
  { id: 3, name: 'USER' }
];

const sampleUser = {
  id: 7,
  first_name: 'Usuario',
  last_name: 'Prueba',
  email: 'usuario.prueba@example.com',
  role_id: 3,
  active: true,
  role: roles[2]
};

const validForm = {
  name: 'Usuario',
  lastName: 'Prueba',
  email: 'usuario.prueba@example.com',
  roleId: '3',
  password: 'Prueba123!'
};

function sessionCookie(granted = permissions) {
  const headers = mockSession({
    userId: 1,
    permissions: granted
  });

  const token = headers.Authorization.replace(
    /^Bearer\s+/i,
    ''
  );

  return `access_token=${token}`;
}

beforeEach(() => {
  jest.spyOn(userService, 'listUsers')
    .mockResolvedValue([sampleUser]);

  jest.spyOn(userService, 'listRoles')
    .mockResolvedValue(roles);

  jest.spyOn(userService, 'findById')
    .mockResolvedValue(sampleUser);

  jest.spyOn(userService, 'createUser')
    .mockResolvedValue(sampleUser);

  jest.spyOn(userService, 'updateUser')
    .mockResolvedValue(sampleUser);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('F13 - Administracion de usuarios SSR', () => {

  test('Renderiza los usuarios y sus roles', async () => {
    const response = await request(app)
      .get('/admin/users?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.headers['content-type'])
      .toContain('text/html');

    expect(response.text)
      .toContain('usuario.prueba@example.com');

    expect(response.text)
      .toContain('USER');
  });

  test('Redirige al login sin sesion', async () => {
    const response = await request(app)
      .get('/admin/users');

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toContain('/login');
  });

  test('Devuelve 403 sin permisos', async () => {
    await request(app)
      .get('/admin/users')
      .set('Cookie', sessionCookie([]))
      .expect(403);
  });

  test('Muestra el formulario de creacion', async () => {
    const response = await request(app)
      .get('/admin/users/new?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Nuevo usuario');

    expect(response.text)
      .toContain('SALES');
  });

  test('Crea un usuario mediante PRG', async () => {
    const response = await request(app)
      .post('/admin/users')
      .set('Cookie', sessionCookie())
      .type('form')
      .send(validForm);

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toBe('/admin/users');

    expect(userService.createUser)
      .toHaveBeenCalledWith({
        ...validForm,
        roleId: 3
      });
  });

  test.each([
    { name: '' },
    { lastName: '' },
    { email: 'correo-invalido' },
    { roleId: 'abc' },
    { password: '' },
    { password: '123' },
    { password: 'a'.repeat(73) }
  ])('Rechaza formulario invalido: %j', async changes => {
    await request(app)
      .post('/admin/users')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        ...validForm,
        ...changes
      })
      .expect(400);

    expect(userService.createUser)
      .not.toHaveBeenCalled();
  });

  test('Rechaza un correo duplicado', async () => {
    userService.createUser.mockRejectedValue(
      new UniqueConstraintError({
        message: 'Duplicate email'
      })
    );

    const response = await request(app)
      .post('/admin/users?lang=es')
      .set('Cookie', sessionCookie())
      .type('form')
      .send(validForm);

    expect(response.status).toBe(400);

    expect(response.text)
      .toContain('El correo electrónico ya está registrado');

    expect(response.text)
      .toContain(validForm.email);

    expect(response.text)
      .not.toContain(validForm.password);
  });

  test('Rechaza un rol inexistente', async () => {
    userService.createUser.mockRejectedValue(
      new userService.UserServiceError(
        400,
        'users.invalidRole',
        'roleId'
      )
    );

    await request(app)
      .post('/admin/users')
      .set('Cookie', sessionCookie())
      .type('form')
      .send(validForm)
      .expect(400);
  });

  test('Muestra el formulario de edicion', async () => {
    const response = await request(app)
      .get('/admin/users/7/edit?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Editar usuario');

    expect(response.text)
      .toContain(sampleUser.email);

    expect(response.text)
      .not.toContain('password_hash');

    expect(response.text)
      .not.toContain('salt_key');
  });

  test('Edita sin cambiar la contrasena', async () => {
    await request(app)
      .post('/admin/users/7')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        ...validForm,
        password: ''
      })
      .expect(302);

    expect(userService.updateUser)
      .toHaveBeenCalledWith(
        7,
        {
          name: validForm.name,
          lastName: validForm.lastName,
          email: validForm.email,
          roleId: 3
        },
        1
      );
  });

  test.each(['true', 'false'])(
    'Actualiza el estado a %s',
    async active => {
      await request(app)
        .post('/admin/users/7/status')
        .set('Cookie', sessionCookie())
        .type('form')
        .send({ active })
        .expect(302);

      expect(userService.updateUser)
        .toHaveBeenCalledWith(
          7,
          { active: active === 'true' },
          1
        );
    }
  );

  test('Rechaza un estado invalido', async () => {
    await request(app)
      .post('/admin/users/7/status')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({ active: 'invalid' })
      .expect(400);
  });

  test('Devuelve 404 si no existe el usuario', async () => {
    userService.findById.mockResolvedValue(null);

    await request(app)
      .get('/admin/users/999/edit')
      .set('Cookie', sessionCookie())
      .expect(404);
  });

  test('Impide crear usuarios sin permiso', async () => {
    await request(app)
      .post('/admin/users')
      .set('Cookie', sessionCookie([
        'users:read:any'
      ]))
      .type('form')
      .send(validForm)
      .expect(403);

    expect(userService.createUser)
      .not.toHaveBeenCalled();
  });

  test('Impide actualizar usuarios sin permiso', async () => {
    await request(app)
      .post('/admin/users/7')
      .set('Cookie', sessionCookie([
        'users:read:any'
      ]))
      .type('form')
      .send(validForm)
      .expect(403);

    expect(userService.updateUser)
      .not.toHaveBeenCalled();
  });

  test('Oculta botones de escritura sin permiso', async () => {
    const response = await request(app)
      .get('/admin/users')
      .set('Cookie', sessionCookie([
        'users:read:any'
      ]));

    expect(response.status).toBe(200);

    expect(response.text)
      .not.toContain('/admin/users/new');

    expect(response.text)
      .not.toContain('/admin/users/7/edit');
  });

  test('Renderiza el listado en ingles', async () => {
    const response = await request(app)
      .get('/admin/users?lang=en')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('User management');
  });

  test('Muestra el estado vacio', async () => {
    userService.listUsers.mockResolvedValue([]);

    const response = await request(app)
      .get('/admin/users?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('No hay usuarios registrados.');
  });

});
