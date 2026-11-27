
const roleService = require('../services/role.service');

const {
  Role,
  Permission,
  sequelize
} = require('../models/sql');

const transaction = {
  LOCK: {
    UPDATE: 'UPDATE'
  }
};

let role;

beforeEach(() => {

  role = {
    id: 2,
    setPermissions: jest.fn().mockResolvedValue(),
    getPermissions: jest.fn().mockResolvedValue([
      { id: 1 },
      { id: 2 }
    ]),
    reload: jest.fn().mockResolvedValue({
      id: 2,
      permissions: []
    }),
    update: jest.fn().mockResolvedValue()
  };

  jest.spyOn(sequelize, 'transaction')
    .mockImplementation(
      async callback => callback(transaction)
    );

  jest.spyOn(Role, 'findByPk')
    .mockResolvedValue(role);

  jest.spyOn(Permission, 'findAll')
    .mockResolvedValue([
      { id: 1 },
      { id: 2 }
    ]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('Actualiza permisos dentro de una transaccion', async () => {
  await roleService.updatePermissions(
    2,
    [1, 2],
    1
  );

  expect(sequelize.transaction)
    .toHaveBeenCalledTimes(1);

  expect(role.setPermissions)
    .toHaveBeenCalledWith(
      [1, 2],
      { transaction }
    );
});

test('Elimina identificadores duplicados', async () => {
  await roleService.updatePermissions(
    2,
    [1, 2, 2],
    1
  );

  expect(role.setPermissions)
    .toHaveBeenCalledWith(
      [1, 2],
      { transaction }
    );
});

test('Rechaza permisos inexistentes', async () => {
  Permission.findAll.mockResolvedValue([
    { id: 1 }
  ]);

  await expect(
    roleService.updatePermissions(
      2,
      [1, 999],
      1
    )
  ).rejects.toMatchObject({
    status: 400
  });

  expect(role.setPermissions)
    .not.toHaveBeenCalled();
});

test('Permite retirar todos los permisos de otro rol', async () => {
  await roleService.updatePermissions(
    2,
    [],
    1
  );

  expect(role.setPermissions)
    .toHaveBeenCalledWith(
      [],
      { transaction }
    );
});

test('Protege los permisos del propio rol', async () => {
  await expect(
    roleService.updatePermissions(
      2,
      [],
      2
    )
  ).rejects.toMatchObject({
    status: 400,
    messageKey: 'ssr.adminRoles.selfProtected'
  });

  expect(role.setPermissions)
    .not.toHaveBeenCalled();
});

test('Devuelve null si el rol no existe', async () => {
  Role.findByPk.mockResolvedValue(null);

  const result =
    await roleService.updatePermissions(
      999,
      [1, 2],
      1
    );

  expect(result).toBeNull();
});
