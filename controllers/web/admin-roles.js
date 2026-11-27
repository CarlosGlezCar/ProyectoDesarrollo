
const createError = require('http-errors');

const roleService = require('../../services/role.service');
const { isSqlId } = require('../../utils/validation');

function getId(req) {
  if (!isSqlId(req.params.id)) {
    throw createError(404);
  }

  return Number(req.params.id);
}

// Agrupar permisos por recurso
function groupPermissions(permissions) {
  const groups = new Map();

  for (const permission of permissions) {
    const resource = permission.key.split(':')[0];

    if (!groups.has(resource)) {
      groups.set(resource, []);
    }

    groups.get(resource).push(permission);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([resource, items]) => ({
      resource,
      permissions: items.sort(
        (a, b) => a.key.localeCompare(b.key)
      )
    }));
}

// Obtener las casillas seleccionadas
function readPermissionIds(body = {}) {
  if (body.permissionsSubmitted !== '1') {
    throw createError(400);
  }

  const raw = body.permissionIds;

  // Cuando ninguna casilla esta seleccionada
  if (raw === undefined) {
    return [];
  }

  const values = Array.isArray(raw)
    ? raw
    : [raw];

  if (!values.every(isSqlId)) {
    throw createError(400);
  }

  return [...new Set(values.map(Number))];
}

// Renderizar formulario
async function renderForm(req, res, role, {
  status = 200,
  error = null,
  selectedIds = null
} = {}) {
  res.set('Cache-Control', 'no-store');

  const permissions =
    await roleService.listPermissions();

  const selected = selectedIds === null
    ? (role.permissions || []).map(p => Number(p.id))
    : selectedIds;

  return res.status(status).render('admin/roles/edit', {
    title: req.__('ssr.adminRoles.editTitle'),
    description: req.__('ssr.adminRoles.description'),
    role,
    groups: groupPermissions(permissions),
    selectedIds: selected,
    isOwnRole: Number(req.user.role_id) === Number(role.id),
    error
  });
}

function setFlash(req, res) {
  res.cookie('flash', JSON.stringify({
    type: 'success',
    message: req.__('ssr.adminRoles.updated')
  }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.app.get('env') === 'production',
    maxAge: 60 * 1000,
    path: '/'
  });
}

// GET /admin/roles
async function listRoles(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');

    const roles = await roleService.listRoles();

    return res.render('admin/roles/index', {
      title: req.__('ssr.adminRoles.title'),
      description: req.__('ssr.adminRoles.description'),
      roles
    });

  } catch (err) {
    return next(err);
  }
}

// GET /admin/roles/:id/edit
async function editRole(req, res, next) {
  try {
    const role = await roleService.findById(
      getId(req)
    );

    if (!role) {
      return next(createError(404));
    }

    return await renderForm(req, res, role);

  } catch (err) {
    return next(err);
  }
}

// POST /admin/roles/:id
async function updateRole(req, res, next) {
  try {
    const id = getId(req);
    const role = await roleService.findById(id);

    if (!role) {
      return next(createError(404));
    }

    let ids;

    try {
      ids = readPermissionIds(req.body || {});
    } catch {
      return await renderForm(req, res, role, {
        status: 400,
        error: req.__('ssr.adminRoles.invalidPermissions')
      });
    }

    try {
      const updated = await roleService.updatePermissions(
        id,
        ids,
        req.user.role_id
      );

      if (!updated) {
        return next(createError(404));
      }

    } catch (err) {
      if (
        err instanceof roleService.RoleServiceError ||
        err.status === 400
      ) {
        return await renderForm(req, res, role, {
          status: 400,
          selectedIds: ids,
          error: req.__(
            err.messageKey ||
            'ssr.adminRoles.invalidPermissions'
          )
        });
      }

      throw err;
    }

    setFlash(req, res);

    return res.redirect(302, '/admin/roles');

  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listRoles,
  editRole,
  updateRole
};
