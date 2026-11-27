const {
  Product,
  ProductVariant,
  Inventory
} = require('../models/sql');

const { Order } = require('../models/mongo');
const orderService = require('../services/order.service');
const dashboardService = require('../services/dashboard.service');

afterEach(() => {
  jest.restoreAllMocks();
});

test('Combina indicadores SQL y MongoDB', async () => {

  jest.spyOn(Product, 'count')
    .mockResolvedValue(7);

  jest.spyOn(ProductVariant, 'count')
    .mockResolvedValue(3);

  jest.spyOn(Inventory, 'sum')
    .mockResolvedValue(80);

  jest.spyOn(orderService, 'countOrders')
    .mockResolvedValue(2);

  jest.spyOn(orderService, 'recentOrders')
    .mockResolvedValue([
      {
        _id: '507f1f77bcf86cd799439021',
        totals: { total: '1100.00' },
        statusHistory: [
          { status: 'pending' },
          { status: 'paid' }
        ]
      }
    ]);

  const result = await dashboardService.getDashboard();

  expect(result.stats).toEqual({
    products: 7,
    variants: 3,
    stock: 80,
    orders: 2
  });

  expect(result.recentOrders[0].status)
    .toBe('paid');

  expect(result.recentOrders[0].total)
    .toBe('1100.00');

  expect(Inventory.sum)
    .toHaveBeenCalledWith('stock');

  expect(orderService.recentOrders)
    .toHaveBeenCalledWith(5);

});

test('Ordena pedidos por fecha y limita a cinco', async () => {

  const query = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([])
  };

  jest.spyOn(Order, 'find')
    .mockReturnValue(query);

  await orderService.recentOrders(5);

  expect(query.sort).toHaveBeenCalledWith({
    createdAt: -1,
    _id: -1
  });

  expect(query.limit).toHaveBeenCalledWith(5);

});