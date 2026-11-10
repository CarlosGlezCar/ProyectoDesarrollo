const { api, login, bearer } = require('./helpers');
const es = require('../../locales/es.json');

describe('Administración de Roles E2E (/api/roles)', () => {
  let adminToken;
  let salesToken;
  let userToken;
  let productsReadPerm;
  let ordersReadPerm;
  let variantsReadPerm;
  const createdRoleIds = [];
  let roleCounter = 0;

  function generateRoleName(suffix = '') {
    roleCounter += 1;
    const base = `E2E ROL ${Date.now()}_${roleCounter}`;
    return suffix ? `${base}_${suffix}`.substring(0, 50) : base.substring(0, 50);
  }

  beforeAll(async () => {
    adminToken = await login('ADMIN');
    salesToken = await login('SALES');
    userToken = await login('USER');

    const permsRes = await api()
      .get('/api/permissions')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    const perms = permsRes.body.data || [];
    productsReadPerm = perms.find(p => p.key === 'products:read:any');
    ordersReadPerm = perms.find(p => p.key === 'orders:read:any');
    variantsReadPerm = perms.find(p => p.key === 'variants:read:any');

    if (!productsReadPerm || !ordersReadPerm || !variantsReadPerm) {
      throw new Error('No se encontraron los permisos requeridos en GET /api/permissions');
    }
  });

  afterAll(async () => {
    for (const id of createdRoleIds) {
      try {
        const checkRes = await api()
          .get(`/api/roles/${id}`)
          .set('Accept-Language', 'es')
          .set(bearer(adminToken));

        if (checkRes.statusCode === 200) {
          await api()
            .delete(`/api/roles/${id}`)
            .set('Accept-Language', 'es')
            .set(bearer(adminToken));
        }
      } catch (_) {
        // ignore
      }
    }
  });

  test('1. Ciclo completo sobre un rol propio', async () => {
    const roleName = generateRoleName('ciclo');
    const roleDesc = 'Rol inicial ciclo E2E';
    const permissionIds = [productsReadPerm.id, ordersReadPerm.id];

    // POST /api/roles responde 201 con el mensaje roles.created
    const postRes = await api()
      .post('/api/roles')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: roleName,
        description: roleDesc,
        permissionIds
      });

    expect(postRes.statusCode).toBe(201);
    expect(postRes.body.message).toBe(es.roles.created);
    expect(postRes.body.data).toHaveProperty('id');
    expect(postRes.body.data.name).toBe(roleName);
    expect(postRes.body.data.description).toBe(roleDesc);

    const roleId = postRes.body.data.id;
    createdRoleIds.push(roleId);

    // GET /api/roles/:id responde 200
    const getByIdRes = await api()
      .get(`/api/roles/${roleId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getByIdRes.statusCode).toBe(200);
    expect(getByIdRes.body.data.id).toBe(roleId);
    expect(getByIdRes.body.data.name).toBe(roleName);
    expect(getByIdRes.body.data.description).toBe(roleDesc);

    // GET /api/roles responde 200 y la lista contiene el id
    const listRes = await api()
      .get('/api/roles')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.some(r => r.id === roleId)).toBe(true);

    // PUT cambia name y description y responde 200 (verifica con un GET posterior)
    const updatedName = generateRoleName('ciclo_upd');
    const updatedDesc = 'Rol ciclo E2E modificado';

    const putRes = await api()
      .put(`/api/roles/${roleId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: updatedName,
        description: updatedDesc
      });

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.message).toBe(es.roles.updated);
    expect(putRes.body.data.name).toBe(updatedName);
    expect(putRes.body.data.description).toBe(updatedDesc);

    const getAfterPutRes = await api()
      .get(`/api/roles/${roleId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getAfterPutRes.statusCode).toBe(200);
    expect(getAfterPutRes.body.data.name).toBe(updatedName);
    expect(getAfterPutRes.body.data.description).toBe(updatedDesc);

    // DELETE responde 200
    const deleteRes = await api()
      .delete(`/api/roles/${roleId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.message).toBe(es.roles.deleted);

    // un GET posterior responde 404 con roles.notFound
    const getAfterDeleteRes = await api()
      .get(`/api/roles/${roleId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getAfterDeleteRes.statusCode).toBe(404);
    expect(getAfterDeleteRes.body.message).toBe(es.roles.notFound);
  });

  test('2. Relaciones: permisos asignados, reemplazo y vaciado', async () => {
    const roleName = generateRoleName('relaciones');
    const initialPermKeys = [productsReadPerm.key, ordersReadPerm.key];
    const initialPermIds = [productsReadPerm.id, ordersReadPerm.id];

    // POST /api/roles crea rol con permisos iniciales
    const postRes = await api()
      .post('/api/roles')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: roleName,
        description: 'Rol para pruebas de relaciones',
        permissionIds: initialPermIds
      });

    expect(postRes.statusCode).toBe(201);
    const roleId = postRes.body.data.id;
    createdRoleIds.push(roleId);

    // el rol creado devuelve data.permissions con exactamente los permisos asignados (por su key)
    expect(Array.isArray(postRes.body.data.permissions)).toBe(true);
    const postPermKeys = postRes.body.data.permissions.map(p => p.key).sort();
    expect(postPermKeys).toEqual([...initialPermKeys].sort());

    // GET /api/roles/:id también devuelve exactamente los permisos asignados
    const getRes = await api()
      .get(`/api/roles/${roleId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getRes.statusCode).toBe(200);
    const getPermKeys = getRes.body.data.permissions.map(p => p.key).sort();
    expect(getPermKeys).toEqual([...initialPermKeys].sort());

    // un PUT con otros permissionIds reemplaza los permisos
    const replacePermKeys = [variantsReadPerm.key];
    const replacePermIds = [variantsReadPerm.id];

    const putReplaceRes = await api()
      .put(`/api/roles/${roleId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        permissionIds: replacePermIds
      });

    expect(putReplaceRes.statusCode).toBe(200);
    expect(putReplaceRes.body.message).toBe(es.roles.updated);
    expect(Array.isArray(putReplaceRes.body.data.permissions)).toBe(true);
    const replacedKeys = putReplaceRes.body.data.permissions.map(p => p.key);
    expect(replacedKeys).toEqual(replacePermKeys);

    // Verificamos con GET posterior
    const getAfterReplaceRes = await api()
      .get(`/api/roles/${roleId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getAfterReplaceRes.statusCode).toBe(200);
    const getAfterReplacedKeys = getAfterReplaceRes.body.data.permissions.map(p => p.key);
    expect(getAfterReplacedKeys).toEqual(replacePermKeys);

    // un PUT con permissionIds [] los deja vacíos
    const putEmptyRes = await api()
      .put(`/api/roles/${roleId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        permissionIds: []
      });

    expect(putEmptyRes.statusCode).toBe(200);
    expect(putEmptyRes.body.message).toBe(es.roles.updated);
    expect(Array.isArray(putEmptyRes.body.data.permissions)).toBe(true);
    expect(putEmptyRes.body.data.permissions).toHaveLength(0);

    // Verificamos con GET posterior
    const getAfterEmptyRes = await api()
      .get(`/api/roles/${roleId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getAfterEmptyRes.statusCode).toBe(200);
    expect(Array.isArray(getAfterEmptyRes.body.data.permissions)).toBe(true);
    expect(getAfterEmptyRes.body.data.permissions).toHaveLength(0);
  });

  test('3. Datos inválidos responden 400', async () => {
    // POST sin body responde 400
    const resNoBody = await api()
      .post('/api/roles')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(resNoBody.statusCode).toBe(400);

    // POST sin name responde 400
    const resNoName = await api()
      .post('/api/roles')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        description: 'Rol sin campo name'
      });

    expect(resNoName.statusCode).toBe(400);

    // POST con name vacío "   " responde 400 con roles.nameRequired
    const resEmptyName = await api()
      .post('/api/roles')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: '   ',
        description: 'Rol con espacios en name'
      });

    expect(resEmptyName.statusCode).toBe(400);
    expect(resEmptyName.body.message).toBe(es.roles.nameRequired);

    // con un permissionId inexistente (99999999) responde 400 y se comprueba que el rol NO se creó
    const badPermRoleName = generateRoleName('badperm');
    const resBadPerm = await api()
      .post('/api/roles')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: badPermRoleName,
        description: 'Rol con permiso inexistente',
        permissionIds: [99999999]
      });

    expect(resBadPerm.statusCode).toBe(400);

    const listCheckBadPerm = await api()
      .get('/api/roles')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(listCheckBadPerm.statusCode).toBe(200);
    expect(listCheckBadPerm.body.data.some(r => r.name === badPermRoleName)).toBe(false);

    // Comportamiento real de la API con name repetido:
    // El modelo Role y la base de datos no imponen restricción de unicidad en 'name',
    // ni el controlador verifica duplicados, por lo que la API responde 201.
    const dupRoleName = generateRoleName('dup');
    const firstRoleRes = await api()
      .post('/api/roles')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: dupRoleName,
        description: 'Primer rol con nombre'
      });

    expect(firstRoleRes.statusCode).toBe(201);
    createdRoleIds.push(firstRoleRes.body.data.id);

    const resDuplicate = await api()
      .post('/api/roles')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: dupRoleName,
        description: 'Segundo rol intentando repetir nombre'
      });

    expect(resDuplicate.statusCode).toBe(201);
    if (resDuplicate.body.data?.id) {
      createdRoleIds.push(resDuplicate.body.data.id);
    }

    // GET /api/roles/abc responde 400 con common.invalidId
    const resInvalidId = await api()
      .get('/api/roles/abc')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(resInvalidId.statusCode).toBe(400);
    expect(resInvalidId.body.message).toBe(es.common.invalidId);
  });

  describe('4. Acceso según la matriz real del seed', () => {
    let testRoleId;

    beforeAll(async () => {
      const roleRes = await api()
        .post('/api/roles')
        .set('Accept-Language', 'es')
        .set(bearer(adminToken))
        .send({
          name: generateRoleName('acceso'),
          description: 'Rol para pruebas de acceso'
        });

      testRoleId = roleRes.body.data.id;
      createdRoleIds.push(testRoleId);
    });

    test('GET /api/roles sin token responde 401', async () => {
      const response = await api()
        .get('/api/roles')
        .set('Accept-Language', 'es');

      expect(response.statusCode).toBe(401);
    });

    test('SALES y USER en GET /api/roles, POST /api/roles y DELETE /api/roles/:id responden 403 con common.forbidden', async () => {
      // SALES GET /api/roles responde 403
      const salesGetRes = await api()
        .get('/api/roles')
        .set('Accept-Language', 'es')
        .set(bearer(salesToken));

      expect(salesGetRes.statusCode).toBe(403);
      expect(salesGetRes.body.message).toBe(es.common.forbidden);

      // SALES POST /api/roles responde 403
      const salesPostRes = await api()
        .post('/api/roles')
        .set('Accept-Language', 'es')
        .set(bearer(salesToken))
        .send({
          name: generateRoleName('sales_forb'),
          description: 'Rol intento SALES'
        });

      expect(salesPostRes.statusCode).toBe(403);
      expect(salesPostRes.body.message).toBe(es.common.forbidden);

      // SALES DELETE /api/roles/:id responde 403
      const salesDeleteRes = await api()
        .delete(`/api/roles/${testRoleId}`)
        .set('Accept-Language', 'es')
        .set(bearer(salesToken));

      expect(salesDeleteRes.statusCode).toBe(403);
      expect(salesDeleteRes.body.message).toBe(es.common.forbidden);

      // USER GET /api/roles responde 403
      const userGetRes = await api()
        .get('/api/roles')
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(userGetRes.statusCode).toBe(403);
      expect(userGetRes.body.message).toBe(es.common.forbidden);

      // USER POST /api/roles responde 403
      const userPostRes = await api()
        .post('/api/roles')
        .set('Accept-Language', 'es')
        .set(bearer(userToken))
        .send({
          name: generateRoleName('user_forb'),
          description: 'Rol intento USER'
        });

      expect(userPostRes.statusCode).toBe(403);
      expect(userPostRes.body.message).toBe(es.common.forbidden);

      // USER DELETE /api/roles/:id responde 403
      const userDeleteRes = await api()
        .delete(`/api/roles/${testRoleId}`)
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(userDeleteRes.statusCode).toBe(403);
      expect(userDeleteRes.body.message).toBe(es.common.forbidden);

      // Verificamos que el rol sigue existiendo y no fue borrado
      const checkRes = await api()
        .get(`/api/roles/${testRoleId}`)
        .set('Accept-Language', 'es')
        .set(bearer(adminToken));

      expect(checkRes.statusCode).toBe(200);
      expect(checkRes.body.data.id).toBe(testRoleId);
    });
  });
});
