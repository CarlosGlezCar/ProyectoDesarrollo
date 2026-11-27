const { Customer, Order } = require('../models/mongo');
const { User } = require('../models/sql');
const orderService = require('./order.service');

// Consulta compartida con la API
async function listCustomers(filter = {}) {
  return Customer.find(filter);
}

// Buscar cliente por identificador
async function findById(id) {
  return Customer.findById(id);
}

// Listado administrativo
async function listAdminCustomers() {
  const customers = await listCustomers();

  return customers.sort(
    (a, b) => String(a.email).localeCompare(String(b.email))
  );
}

// Consultar cliente y sus pedidos asociados
async function findCustomerDetail(id) {
  const customer = await findById(id);

  if (!customer) {
    return null;
  }

  const orders = await orderService.listOrders({
    customerId: customer._id
  });

  orders.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return {
    customer,
    orders
  };
}

// Comprueba que el usuario exista en PostgreSQL y que no se repitan userId ni email.
async function checkReferences(data, currentId = null) {
  const others = currentId ? { _id: { $ne: currentId } } : {};

  if (Object.hasOwn(data, 'userId')) {
    if (!(await User.findByPk(data.userId))) {
      return { status: 404, key: 'users.notFound' };
    }
    if (await Customer.findOne({ ...others, userId: data.userId })) {
      return { status: 400, key: 'common.duplicate' };
    }
  }

  if (Object.hasOwn(data, 'email') &&
      await Customer.findOne({ ...others, email: data.email })) {
    return { status: 400, key: 'customers.emailExists' };
  }

  return null;
}

async function createCustomer(data) {
  const error = await checkReferences(data);
  if (error) return { error };
  return { customer: await Customer.create(data) };
}

async function updateCustomer(id, data) {
  const customer = await findById(id);
  if (!customer) {
    return { error: { status: 404, key: 'customers.notFound' } };
  }

  // La identidad del propietario no se modifica con un PUT normal.
  if (Object.hasOwn(data, 'userId') &&
      Number(data.userId) !== Number(customer.userId)) {
    return { error: { status: 409, key: 'customers.ownerProtected' } };
  }

  const error = await checkReferences(data, customer._id);
  if (error) return { error };

  customer.set(data);
  await customer.save();
  return { customer };
}

async function deleteCustomer(id) {
  if (await Order.exists({ customerId: id })) {
    return { error: { status: 409, key: 'customers.hasOrders' } };
  }

  const customer = await Customer.findByIdAndDelete(id);
  if (!customer) {
    return { error: { status: 404, key: 'customers.notFound' } };
  }

  return { customer };
}

module.exports = {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  listCustomers,
  findById,
  listAdminCustomers,
  findCustomerDetail
};
