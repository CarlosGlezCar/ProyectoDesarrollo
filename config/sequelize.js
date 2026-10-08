const { Sequelize } = require('sequelize');

//Conexión a MYSQL
const sequelize = new Sequelize(
    //Nombre de la base de datos
    'stride_co',
    //Usuario de la base de datos
    'root',
    //Password de la base de datos
    'abcd1234',
    //
    {
        //Host define la dirección del servidor de la base de datos
        host: 'localhost',
        //Port: puerto en el que atiende nuestro servidor de base de datos
        port: 3306,
        //Dialect: Es la propiedad donde definimos la base de datos especificamente que vamos a usar
        dialect: 'mysql',
        logging: false,
        define: {
            //Nos permite definir si queremos agregar automaticamente a nuestros modelos las propiedades createdAt --> created_at, roleId -- > role_id
            underscored: true
        }
    }
);

module.exports = sequelize;