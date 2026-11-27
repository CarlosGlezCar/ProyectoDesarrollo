
const express = require('express');

const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');
const webPost = require('../../middlewares/web-post');

const controller = require('../../controllers/web/admin');
const variantsController = require('../../controllers/web/variants');
const inventoryController = require('../../controllers/web/inventory');
const dashboardController = require('../../controllers/web/dashboard');
const adminOrdersController = require('../../controllers/web/admin-orders');
const adminCustomersController = require('../../controllers/web/admin-customers');
const adminUsersController = require('../../controllers/web/admin-users');
const adminRolesController = require('../../controllers/web/admin-roles');

const router = express.Router();

// F7 - DASHBOARD ADMINISTRATIVO
router.get(
  '/',
  authenticate,
  authorize('products', 'read', 'any'),
  authorize('orders', 'read', 'any'),
  dashboardController.showDashboard
);

// F8: LISTAR PRODUCTOS
router.get(
  '/products',
  authenticate,
  authorize('products', 'read', 'any'),
  controller.listProducts
);

// F8: FORMULARIO DE CREACIÓN
router.get(
  '/products/new',
  authenticate,
  authorize('products', 'create', 'any'),
  controller.newProduct
);

// F8: CREAR PRODUCTO
router.post(
  '/products',
  authenticate,
  webPost,
  authorize('products', 'create', 'any'),
  controller.createProduct
);

// F8: FORMULARIO DE EDICIÓN
router.get(
  '/products/:id/edit',
  authenticate,
  authorize('products', 'update', 'any'),
  controller.editProduct
);

// F8: ACTUALIZAR PRODUCTO
router.post(
  '/products/:id',
  authenticate,
  webPost,
  authorize('products', 'update', 'any'),
  controller.updateProduct
);

// F8: ACTIVAR / DESACTIVAR
router.post(
  '/products/:id/status',
  authenticate,
  webPost,
  authorize('products', 'update', 'any'),
  controller.changeProductStatus
);

// F8: ELIMINAR PRODUCTO
router.post(
  '/products/:id/delete',
  authenticate,
  webPost,
  authorize('products', 'delete', 'any'),
  controller.deleteProduct
);

// ==========================================
// F9 - ADMINISTRACION DE VARIANTES
// ==========================================

// Listar variantes
router.get(
  '/variants',
  authenticate,
  authorize('variants', 'read', 'any'),
  variantsController.listVariants
);

// Formulario de creacion
router.get(
  '/variants/new',
  authenticate,
  authorize('variants', 'create', 'any'),
  variantsController.newVariant
);

// Crear variante
router.post(
  '/variants',
  authenticate,
  webPost,
  authorize('variants', 'create', 'any'),
  variantsController.createVariant
);

// Formulario de edicion
router.get(
  '/variants/:id/edit',
  authenticate,
  authorize('variants', 'update', 'any'),
  variantsController.editVariant
);

// Actualizar variante
router.post(
  '/variants/:id',
  authenticate,
  webPost,
  authorize('variants', 'update', 'any'),
  variantsController.updateVariant
);

// ==========================================
// F10 - ADMINISTRACION DE INVENTARIO
// ==========================================

router.get(
  '/inventory',
  authenticate,
  authorize('inventory', 'read', 'any'),
  inventoryController.listInventory
);

router.post(
  '/inventory/:variantId',
  authenticate,
  webPost,
  authorize('inventory', 'read', 'any'),
  authorize('inventory', 'update', 'any'),
  inventoryController.updateInventory
);

// ==========================================
// F11 - ADMINISTRACION DE PEDIDOS
// ==========================================

router.get(
  '/orders',
  authenticate,
  authorize('orders', 'read', 'any'),
  adminOrdersController.listOrders
);

router.get(
  '/orders/:id',
  authenticate,
  authorize('orders', 'read', 'any'),
  adminOrdersController.showOrder
);

router.post(
  '/orders/:id/status',
  authenticate,
  webPost,
  authorize('orders', 'read', 'any'),
  authorize('orders', 'update', 'any'),
  adminOrdersController.updateStatus
);

// ==========================================
// F12 - ADMINISTRACION DE CLIENTES
// ==========================================

router.get(
  '/customers',
  authenticate,
  authorize('customers', 'read', 'any'),
  adminCustomersController.listCustomers
);

router.get(
  '/customers/:id',
  authenticate,
  authorize('customers', 'read', 'any'),
  adminCustomersController.showCustomer
);

// ==========================================
// F13 - ADMINISTRACION DE USUARIOS
// ==========================================

router.get(
  '/users',
  authenticate,
  authorize('users', 'read', 'any'),
  adminUsersController.listUsers
);

router.get(
  '/users/new',
  authenticate,
  authorize('users', 'create', 'any'),
  adminUsersController.newUser
);

router.post(
  '/users',
  authenticate,
  webPost,
  authorize('users', 'create', 'any'),
  adminUsersController.createUser
);

router.get(
  '/users/:id/edit',
  authenticate,
  authorize('users', 'update', 'any'),
  adminUsersController.editUser
);

router.post(
  '/users/:id',
  authenticate,
  webPost,
  authorize('users', 'update', 'any'),
  adminUsersController.updateUser
);

router.post(
  '/users/:id/status',
  authenticate,
  webPost,
  authorize('users', 'update', 'any'),
  adminUsersController.changeStatus
);

// ==========================================
// F14 - ROLES Y PERMISOS
// ==========================================

router.get(
  '/roles',
  authenticate,
  authorize('roles', 'read', 'any'),
  adminRolesController.listRoles
);

router.get(
  '/roles/:id/edit',
  authenticate,
  authorize('roles', 'update', 'any'),
  adminRolesController.editRole
);

router.post(
  '/roles/:id',
  authenticate,
  webPost,
  authorize('roles', 'update', 'any'),
  adminRolesController.updateRole
);

module.exports = router;