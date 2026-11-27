
const request = require('supertest');
const app = require('../app');

const inventoryService = require('../services/inventory.service');
const { mockSession } = require('./helpers/session');

const sampleInventory = {
  id: 7,
  variant_id: 1,
  stock: 20,
  reserved: 5,
  variant: {
    id: 1,
    sku: 'STRIDE-001-25',
    size: '25',
    color: 'Negro',
    product: {
      id: 1,
      name: 'Tenis deportivos Stride'
    }
  }
};

const permissions = [
  'inventory:read:any',
  'inventory:update:any'
];

function sessionCookie(grantedPermissions = permissions) {
  const headers = mockSession({
    permissions: grantedPermissions
  });

  const token = headers.Authorization.replace(
    /^Bearer\s+/i,
    ''
  );

  return `access_token=${token}`;
}

beforeEach(() => {
  jest.spyOn(inventoryService, 'listAll')
    .mockResolvedValue([sampleInventory]);

  jest.spyOn(inventoryService, 'findByVariantId')
    .mockResolvedValue(sampleInventory);

  jest.spyOn(inventoryService, 'updateByVariantId')
    .mockResolvedValue({
      inventory: sampleInventory
    });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('F10 - Administracion SSR de inventario', () => {

  test('Protege las reservas asignadas a pedidos', async () => {

    inventoryService.updateByVariantId
      .mockResolvedValue({
        status: 400,
        error: 'inventory.protectedReservations'
      });

    const response = await request(app).post('/admin/inventory/1?lang=es').set('Cookie', sessionCookie()).type('form').send({
        stock: '50',
        reserved: '0'
      });

    expect(response.status).toBe(400);

    expect(response.text).toContain(
      'No puedes reducir las unidades reservadas'
    );

  });

  test('Muestra el inventario en HTML', async () => {
    const response = await request(app)
      .get('/admin/inventory?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.headers['content-type'])
      .toContain('text/html');

    expect(response.text)
      .toContain('STRIDE-001-25');

    expect(response.text)
      .toContain('Tenis deportivos Stride');

    expect(response.text)
      .toMatch(/>15<\/span>/);

    expect(response.text)
      .not.toContain('password_hash');

    expect(response.text)
      .not.toContain('salt_key');
  });

  test('Redirige al login sin sesion', async () => {
    const response = await request(app)
      .get('/admin/inventory');

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toContain('/login');
  });

  test('Devuelve 403 sin permiso de lectura', async () => {
    await request(app)
      .get('/admin/inventory')
      .set('Cookie', sessionCookie([]))
      .expect(403);

    expect(inventoryService.listAll)
      .not.toHaveBeenCalled();
  });

  test('Actualiza inventario mediante PRG', async () => {
    const response = await request(app)
      .post('/admin/inventory/1')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        stock: '50',
        reserved: '10'
      });

    expect(response.status).toBe(302);

    expect(response.headers.location)
      .toBe('/admin/inventory');

    expect(inventoryService.updateByVariantId)
      .toHaveBeenCalledWith(1, {
        stock: 50,
        reserved: 10
      });

    expect(response.headers['set-cookie'].join(';'))
      .toContain('flash=');
  });

  test('Rechaza reservadas superiores al stock', async () => {
    const response = await request(app)
      .post('/admin/inventory/1?lang=es')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        stock: '10',
        reserved: '15'
      });

    expect(response.status).toBe(400);

    expect(response.text)
      .toContain(
        'Las unidades reservadas no pueden superar las existencias.'
      );

    expect(response.text)
      .toContain('value="15"');

    expect(inventoryService.updateByVariantId)
      .not.toHaveBeenCalled();
  });

  test.each([
    ['-5', '0'],
    ['10', '-1'],
    ['10.5', '2'],
    ['abc', '0'],
    ['', '0'],
    ['2147483648', '0']
  ])('Rechaza cantidades invalidas: %s y %s', async (stock, reserved) => {

    await request(app)
      .post('/admin/inventory/1')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({ stock, reserved })
      .expect(400);

    expect(inventoryService.updateByVariantId)
      .not.toHaveBeenCalled();
  });

  test('Permite inventario en cero', async () => {
    await request(app)
      .post('/admin/inventory/1')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        stock: '0',
        reserved: '0'
      })
      .expect(302);

    expect(inventoryService.updateByVariantId)
      .toHaveBeenCalledWith(1, {
        stock: 0,
        reserved: 0
      });
  });

  test('Devuelve 404 si no existe el inventario', async () => {
    inventoryService.findByVariantId
      .mockResolvedValue(null);

    await request(app)
      .post('/admin/inventory/999999')
      .set('Cookie', sessionCookie())
      .type('form')
      .send({
        stock: '10',
        reserved: '0'
      })
      .expect(404);

    expect(inventoryService.updateByVariantId)
      .not.toHaveBeenCalled();
  });

  test('Impide modificar inventario sin permiso', async () => {
    await request(app)
      .post('/admin/inventory/1')
      .set('Cookie', sessionCookie([
        'inventory:read:any'
      ]))
      .type('form')
      .send({
        stock: '50',
        reserved: '10'
      })
      .expect(403);

    expect(inventoryService.updateByVariantId)
      .not.toHaveBeenCalled();
  });

  test('Oculta los formularios al usuario de solo lectura', async () => {
    const response = await request(app)
      .get('/admin/inventory?lang=es')
      .set('Cookie', sessionCookie([
        'inventory:read:any'
      ]));

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Solo lectura');

    expect(response.text)
      .not.toContain('action="/admin/inventory/1"');
  });

  test('Renderiza inventario en ingles', async () => {
    const response = await request(app)
      .get('/admin/inventory?lang=en')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Inventory management');
  });

  test('Muestra el estado de lista vacia', async () => {
    inventoryService.listAll.mockResolvedValue([]);

    const response = await request(app)
      .get('/admin/inventory?lang=es')
      .set('Cookie', sessionCookie());

    expect(response.status).toBe(200);

    expect(response.text)
      .toContain('Todavía no hay inventarios registrados.');
  });

});