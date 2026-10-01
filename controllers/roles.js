const Role = require('../models/relationals/Role');

//CREATE
async function create(req, res, next){
    const name = req.body.name;
    const description = req.body.description;

    const role = await Role.create({name: name, description: description});

    res.status(201).json({
        message: "role created",
        data: role
    });
}

//READ
async function list(req, res, next) {
    const roles = await Role.findAll();
    res.json({
        message: "Roles list",
        data: roles
    });
}

async function find(req, res, next){
    const id = req.params.id;
    const role = await Role.findByPk(id);
    res.json({
        message: "Find role by id",
        data: role
    });
}

//UPDATE
async function update(req, res, next){
    const id = req.params.id; 
    const name = req.body.name;
    const description = req.body.description;
    const role = await Role.findByPk(id);
    if(!role) res.status(404).json({ message: 'Role not found'});
    let changes = {};
    changes.name = name ? name : role.name;
    changes.description = description ? description : role.description;

    await role.update(changes);

    res.json({
        message: "Role update",
        data: role
    });
}

module.exports = {list, find, update, create};