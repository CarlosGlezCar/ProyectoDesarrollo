const { Role, Permission } = require('../models/relationals');

//CREATE
async function create(req, res, next){
    try{
        const role = await Role.create(req.body);
        if(req.body.permissionIds) role.setpermissions(req.body.permissionIds);
        res.status(201).json({message: req.__('roles.created'), data: role});
    }   catch (err) {
        next(err);
    }

}

//READ
async function list(req, res, next) {
    const roles = await Role.findAll();
    res.json({
        message: req.__('roles.list'),
        data: roles
    });
}

async function find(req, res, next){
    const id = req.params.id;
    const role = await Role.findByPk(id);
    res.json({
        message: req.__('roles.found'),
        data: role
    });
}

//UPDATE
async function update(req, res, next) {
    try {
        const  id  = req.params.id;
        const { name, description, permissions } = req.body;

        const role = await Role.findByPk(id);

        if (!role) {
            return res.status(404).json({
                message: req.__(('roles.notFound'))
            });
        }

        await role.update({
            name: name ?? role.name,
            description: description ?? role.description
        });

        if (permissions) {
            await role.setPermissions(permissions);
        }

        const updatedRole = await Role.findByPk(id, {
            include: {
                model: Permission,
                as: 'permissions'
            }
        });

        res.json({
            message: req.__('roles.updated'),
            data: updatedRole
        });

    } catch (err) {
        next(err);
    }
}
module.exports = {list, find, update, create};