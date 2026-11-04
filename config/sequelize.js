const { Sequelize } = require('sequelize');
const config = require('config');

const db = config.get('database.postgres');

const options = {
  dialect: 'postgres',
  logging: false,
  define: {
    underscored: true
  }
};

let sequelize;

if (db.url) {
  sequelize = new Sequelize(db.url, {
    ...options,
    ...(db.ssl ? {
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: true
        }
      }
    } : {})
  });
} else {
  sequelize = new Sequelize(
    db.name,
    db.user,
    db.password,
    {
      ...options,
      host: db.host,
      port: db.port
    }
  );
}

module.exports = sequelize;
