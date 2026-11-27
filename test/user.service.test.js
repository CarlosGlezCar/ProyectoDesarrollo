
const bcrypt = require('bcrypt');

const userService = require('../services/user.service');
const { User, Role } = require('../models/sql');

const data = {
  name: 'Usuario',
  lastName: 'Prueba',
  email: 'usuario.prueba@example.com',
  roleId: 3,
  password: 'Prueba123!'
};

afterEach(() => {
  jest.restoreAllMocks();
});

test('Crea un usuario con bcrypt y oculta datos sensibles', async () => {
  jest.spyOn(Role, 'findByPk')
    .mockResolvedValue({
      id: 3,
      name: 'USER'
    });

  const create = jest.spyOn(User, 'create')
    .mockImplementation(async changes => ({
      id: 7,
      ...changes
    }));

  const result = await userService.createUser(data);

  const saved = create.mock.calls[0][0];

  expect(saved.first_name).toBe('Usuario');

  expect(saved.password_hash)
    .not.toBe(data.password);

  expect(saved.password_hash)
    .toMatch(/^\$2[aby]\$/);

  expect(await bcrypt.compare(
    data.password,
    saved.password_hash
  )).toBe(true);

  expect(saved).not.toHaveProperty('password');

  expect(result)
    .not.toHaveProperty('password_hash');

  expect(result)
    .not.toHaveProperty('salt_key');
});

test('No modifica el hash al editar sin contrasena', async () => {
  const update = jest.fn().mockResolvedValue();

  jest.spyOn(User, 'findByPk')
    .mockResolvedValue({
      id: 7,
      role_id: 3,
      update
    });

  await userService.updateUser(
    7,
    { name: 'Nombre actualizado' },
    1
  );

  expect(update).toHaveBeenCalledWith({
    first_name: 'Nombre actualizado'
  });
});

test('Impide desactivar la propia cuenta', async () => {
  const update = jest.fn();

  jest.spyOn(User, 'findByPk')
    .mockResolvedValue({
      id: 1,
      role_id: 1,
      update
    });

  await expect(
    userService.updateUser(
      1,
      { active: false },
      1
    )
  ).rejects.toMatchObject({
    status: 400
  });

  expect(update).not.toHaveBeenCalled();
});

test('Impide cambiar el propio rol', async () => {
  const update = jest.fn();

  jest.spyOn(User, 'findByPk')
    .mockResolvedValue({
      id: 1,
      role_id: 1,
      update
    });

  await expect(
    userService.updateUser(
      1,
      { roleId: 3 },
      1
    )
  ).rejects.toMatchObject({
    status: 400
  });

  expect(update).not.toHaveBeenCalled();
});

test('Excluye los hashes y salts del listado', async () => {
  const findAll = jest.spyOn(User, 'findAll')
    .mockResolvedValue([
      {
        id: 7,
        email: 'usuario@example.com',
        password_hash: 'hash-secreto',
        salt_key: 'salt-secreto'
      }
    ]);

  const users = await userService.listUsers();

  expect(findAll).toHaveBeenCalledWith(
    expect.objectContaining({
      attributes: {
        exclude: ['password_hash', 'salt_key']
      }
    })
  );

  expect(users[0])
    .not.toHaveProperty('password_hash');

  expect(users[0])
    .not.toHaveProperty('salt_key');
});
