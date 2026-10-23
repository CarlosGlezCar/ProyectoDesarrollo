const { Sequelize } = require('sequelize');
const config = require('config')

const mysqlConfig = config.get("mysql");

//Conexión a MYSQL
const sequelize = new Sequelize(
    //Nombre de la base de datos
    mysqlConfig.database,
    //Usuario de la base de datos
    mysqlConfig.user,
    //Password de la base de datos
    mysqlConfig.password,
    //
    {
        //Host define la dirección del servidor de la base de datos
        host: mysqlConfig.host,
        //Port: puerto en el que atiende nuestro servidor de base de datos
        port: mysqlConfig.port,
        //Dialect: Es la propiedad donde definimos la base de datos especificamente que vamos a usar
        dialect: 'mysql',
        logging: false,
        define: {
            //Nos permite definir si queremos agregar automaticamente a nuestros modelos las propiedades createdAt --> created_at, roleId -- > role_id
            underscored: true
        }
    }
);
console.log("app conectada a " + mysqlConfig.host);

module.exports = sequelize;