const mongoose = require('mongoose');
const connectMongo = require('../config/mongoose');

const { sequelize } = require('../models/sql');

const statusService = require(
  '../services/web-order-status.service'
);

async function recover() {
  try {
    await sequelize.authenticate();
    await connectMongo();

    const operations =
      await statusService.listPendingOperations();

    console.log(
      'Operaciones pendientes:',
      operations.length
    );

    for (const operation of operations) {
      try {
        await statusService.completeOperation(
          operation.order_id,
          operation.history_index
        );

        console.log(
          'Operacion recuperada:',
          operation.order_id,
          operation.entry.status
        );

      } catch (err) {
        console.error(
          'No se pudo recuperar:',
          operation.order_id,
          err.message
        );

        process.exitCode = 1;
      }
    }

  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;

  } finally {
    await Promise.allSettled([
      mongoose.disconnect(),
      sequelize.close()
    ]);
  }
}

recover();