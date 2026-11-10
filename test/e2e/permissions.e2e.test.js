const { api, login, bearer } = require('./helpers');
const es = require('../../locales/es.json');

describe('Administración de Permisos E2E (/api/permissions)', () => {
  let adminToken;
  let salesToken;
  let userToken;
  const createdPermissionIds = [];
  const createdRoleIds = [];

  function randomLetters(len = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }

  function generatePermissionKey(prefix = 'perm') {
    return `${prefix}${randomLetters(10)}:read:any`;
  }

  function generateRoleName(suffix = '') {
    const base = `E2E ROL ${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return suffix ? `${base}_${suffix}`.substring(0, 50) : base.substring(0, 50);
  }

  beforeAll(async () => {
    adminToken = await login('ADMIN');
    salesToken = await login('SALES');
    userToken = await login('USER');
  });

  afterAll(async () => {
    // 1. Borrar roles creados primero para no violar restricciones de clave foránea
    for (const roleId of createdRoleIds) {
      try {
        const checkRes = await api()
          .get(`/api/roles/${roleId}`)
          .set('Accept-Language', 'es')
          .set(bearer(adminToken));

        if (checkRes.statusCode === 200) {
          await api()
            .delete(`/api/roles/${roleId}`)
            .set('Accept-Language', 'es')
            .set(bearer(adminToken));
        }
      } catch (_) {
        // ignore
      }
    }

    // 2. Borrar permisos creados después
    for (const permId of createdPermissionIds) {
      try {
        const checkRes = await api()
          .get(`/api/permissions/${permId}`)
          .set('Accept-Language', 'es')
          .set(bearer(adminToken));

        if (checkRes.statusCode === 200) {
          await api()
            .delete(`/api/permissions/${permId}`)
            .set('Accept-Language', 'es')
            .set(bearer(adminToken));
        }
      } catch (_) {
        // ignore
      }
    }
  });

  test('1. Ciclo completo sobre un permiso propio', async () => {
    const key = generatePermissionKey('ciclo');
    const description = 'Permiso inicial ciclo E2E';

    // POST /api/permissions con key y description responde 201 con permissions.created
    const postRes = await api()
      .post('/api/permissions')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        key,
        description
      });

    expect(postRes.statusCode).toBe(201);
    expect(postRes.body.message).toBe(es.permissions.created);
    expect(postRes.body.data).toHaveProperty('id');
    expect(postRes.body.data.key).toBe(key);
    expect(postRes.body.data.description).toBe(description);

    const permissionId = postRes.body.data.id;
    createdPermissionIds.push(permissionId);

    // GET /api/permissions/:id responde 200 con la misma key
    const getByIdRes = await api()
      .get(`/api/permissions/${permissionId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getByIdRes.statusCode).toBe(200);
    expect(getByIdRes.body.data.id).toBe(permissionId);
    expect(getByIdRes.body.data.key).toBe(key);
    expect(getByIdRes.body.data.description).toBe(description);

    // GET /api/permissions responde 200 y la lista contiene el id
    const listRes = await api()
      .get('/api/permissions')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.some(p => p.id === permissionId)).toBe(true);

    // PUT cambia description y responde 200 (verifica con un GET posterior)
    const updatedDescription = 'Permiso ciclo E2E modificado';

    const putRes = await api()
      .put(`/api/permissions/${permissionId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        description: updatedDescription
      });

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.message).toBe(es.permissions.updated);
    expect(putRes.body.data.description).toBe(updatedDescription);

    const getAfterPutRes = await api()
      .get(`/api/permissions/${permissionId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getAfterPutRes.statusCode).toBe(200);
    expect(getAfterPutRes.body.data.key).toBe(key);
    expect(getAfterPutRes.body.data.description).toBe(updatedDescription);

    // DELETE responde 200
    const deleteRes = await api()
      .delete(`/api/permissions/${permissionId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.message).toBe(es.permissions.deleted);

    // un GET posterior responde 404 con permissions.notFound
    const getAfterDeleteRes = await api()
      .get(`/api/permissions/${permissionId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getAfterDeleteRes.statusCode).toBe(404);
    expect(getAfterDeleteRes.body.message).toBe(es.permissions.notFound);
  });

  test('2. Relaciones: asignación del permiso a un rol propio', async () => {
    // ADMIN crea un permiso de prueba
    const permKey = generatePermissionKey('rel');
    const permRes = await api()
      .post('/api/permissions')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        key: permKey,
        description: 'Permiso para prueba de relaciones con roles'
      });

    expect(permRes.statusCode).toBe(201);
    const permissionId = permRes.body.data.id;
    createdPermissionIds.push(permissionId);

    // ADMIN crea un rol propio con permissionIds [id del permiso de prueba] mediante POST /api/roles
    const roleName = generateRoleName('rel');
    const roleRes = await api()
      .post('/api/roles')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        name: roleName,
        description: 'Rol para asociar permiso de prueba',
        permissionIds: [permissionId]
      });

    expect(roleRes.statusCode).toBe(201);
    const roleId = roleRes.body.data.id;
    createdRoleIds.push(roleId);

    // GET /api/roles/:id devuelve en data.permissions la key del permiso
    const getRoleRes = await api()
      .get(`/api/roles/${roleId}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(getRoleRes.statusCode).toBe(200);
    expect(Array.isArray(getRoleRes.body.data.permissions)).toBe(true);
    expect(getRoleRes.body.data.permissions.some(p => p.key === permKey)).toBe(true);
  });

  test('3. Datos inválidos responden 400', async () => {
    // POST sin body responde 400
    const resNoBody = await api()
      .post('/api/permissions')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(resNoBody.statusCode).toBe(400);

    // POST sin description responde 400
    const resNoDesc = await api()
      .post('/api/permissions')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        key: generatePermissionKey('nodesc')
      });

    expect(resNoDesc.statusCode).toBe(400);

    // POST con key vacía "   " responde 400 con permissions.keyRequired
    const resEmptyKey = await api()
      .post('/api/permissions')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        key: '   ',
        description: 'Permiso con key vacía'
      });

    expect(resEmptyKey.statusCode).toBe(400);
    expect(resEmptyKey.body.message).toBe(es.permissions.keyRequired);

    // con keys de formato inválido (sin dos puntos, acción "write", alcance "all", con mayúsculas, con una parte de más) responde 400 con permissions.invalidKey
    const invalidKeys = [
      'resourcewithoutcolons',      // sin dos puntos
      'resource:write:any',         // acción "write"
      'resource:read:all',          // alcance "all"
      'Resource:read:any',          // con mayúsculas
      'resource:read:any:extra'     // con una parte de más
    ];

    for (const invalidKey of invalidKeys) {
      const resInvalidKey = await api()
        .post('/api/permissions')
        .set('Accept-Language', 'es')
        .set(bearer(adminToken))
        .send({
          key: invalidKey,
          description: 'Key con formato inválido'
        });

      expect(resInvalidKey.statusCode).toBe(400);
      expect(resInvalidKey.body.message).toBe(es.permissions.invalidKey);
    }

    // con una key ya existente responde 400
    const existingKey = generatePermissionKey('dup');
    const firstPermRes = await api()
      .post('/api/permissions')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        key: existingKey,
        description: 'Permiso original con key única'
      });

    expect(firstPermRes.statusCode).toBe(201);
    createdPermissionIds.push(firstPermRes.body.data.id);

    const resDuplicateKey = await api()
      .post('/api/permissions')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        key: existingKey,
        description: 'Permiso duplicado intentando repetir key'
      });

    expect(resDuplicateKey.statusCode).toBe(400);

    // PUT con una key de formato inválido responde 400 con permissions.invalidKey
    const resPutInvalidKey = await api()
      .put(`/api/permissions/${firstPermRes.body.data.id}`)
      .set('Accept-Language', 'es')
      .set(bearer(adminToken))
      .send({
        key: 'invalid:write:any'
      });

    expect(resPutInvalidKey.statusCode).toBe(400);
    expect(resPutInvalidKey.body.message).toBe(es.permissions.invalidKey);

    // GET /api/permissions/abc responde 400 con common.invalidId
    const resInvalidId = await api()
      .get('/api/permissions/abc')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    expect(resInvalidId.statusCode).toBe(400);
    expect(resInvalidId.body.message).toBe(es.common.invalidId);
  });

  describe('4. Acceso según la matriz real del seed', () => {
    let testPermId;

    beforeAll(async () => {
      const permRes = await api()
        .post('/api/permissions')
        .set('Accept-Language', 'es')
        .set(bearer(adminToken))
        .send({
          key: generatePermissionKey('acceso'),
          description: 'Permiso para prueba de acceso y DELETE no autorizado'
        });

      testPermId = permRes.body.data.id;
      createdPermissionIds.push(testPermId);
    });

    test('GET /api/permissions sin token responde 401', async () => {
      const response = await api()
        .get('/api/permissions')
        .set('Accept-Language', 'es');

      expect(response.statusCode).toBe(401);
    });

    test('SALES y USER en GET /api/permissions, POST /api/permissions y DELETE /api/permissions/:id responden 403 con common.forbidden', async () => {
      // SALES GET /api/permissions responde 403
      const salesGetRes = await api()
        .get('/api/permissions')
        .set('Accept-Language', 'es')
        .set(bearer(salesToken));

      expect(salesGetRes.statusCode).toBe(403);
      expect(salesGetRes.body.message).toBe(es.common.forbidden);

      // SALES POST /api/permissions responde 403
      const salesPostRes = await api()
        .post('/api/permissions')
        .set('Accept-Language', 'es')
        .set(bearer(salesToken))
        .send({
          key: generatePermissionKey('salesforb'),
          description: 'Intento de creación por SALES'
        });

      expect(salesPostRes.statusCode).toBe(403);
      expect(salesPostRes.body.message).toBe(es.common.forbidden);

      // SALES DELETE /api/permissions/:id responde 403
      const salesDeleteRes = await api()
        .delete(`/api/permissions/${testPermId}`)
        .set('Accept-Language', 'es')
        .set(bearer(salesToken));

      expect(salesDeleteRes.statusCode).toBe(403);
      expect(salesDeleteRes.body.message).toBe(es.common.forbidden);

      // USER GET /api/permissions responde 403
      const userGetRes = await api()
        .get('/api/permissions')
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(userGetRes.statusCode).toBe(403);
      expect(userGetRes.body.message).toBe(es.common.forbidden);

      // USER POST /api/permissions responde 403
      const userPostRes = await api()
        .post('/api/permissions')
        .set('Accept-Language', 'es')
        .set(bearer(userToken))
        .send({
          key: generatePermissionKey('userforb'),
          description: 'Intento de creación por USER'
        });

      expect(userPostRes.statusCode).toBe(403);
      expect(userPostRes.body.message).toBe(es.common.forbidden);

      // USER DELETE /api/permissions/:id responde 403
      const userDeleteRes = await api()
        .delete(`/api/permissions/${testPermId}`)
        .set('Accept-Language', 'es')
        .set(bearer(userToken));

      expect(userDeleteRes.statusCode).toBe(403);
      expect(userDeleteRes.body.message).toBe(es.common.forbidden);

      // Comprobar que el permiso no fue eliminado por SALES ni USER
      const checkRes = await api()
        .get(`/api/permissions/${testPermId}`)
        .set('Accept-Language', 'es')
        .set(bearer(adminToken));

      expect(checkRes.statusCode).toBe(200);
      expect(checkRes.body.data.id).toBe(testPermId);
    });
  });
});
