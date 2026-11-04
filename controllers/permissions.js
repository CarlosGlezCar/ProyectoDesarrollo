const Permission = require('../models/relationals/Permission');

//CREATE
async function create(req, res, next){
    const key = req.body.key;
    const description = req.body.description;

    const permission = await Permission.create({key: key, description: description});

    res.status(201).json({
        message: req.__('permissions.created'),
        data: permission
    });
}

//READ
async function list(req, res, next) {
    const permissions = await Permission.findAll();
    res.json({
        message: req.__('permissions.list'),
        data: permissions
    });
}

async function find(req, res, next){
    const id = req.params.id;
    const permission = await Permission.findByPk(id);
    res.json({
        message: req.__('permissions.found'),
        data: permission
    });
}

//UPDATE
async function update(req, res, next){
    const id = req.params.id; 
    const key = req.body.key;
    const description = req.body.description;
    const permission = await Permission.findByPk(id);
    if(!permission) res.status(404).json({ message: req.__('permissions.notFound')});
    let changes = {};
    changes.key = key ? key : permission.key;
    changes.description = description ? description : role.description;

    await permission.update(changes);

    res.json({
        message: req.__('permissions.updated'),
        data: permission
    });
}

//DELETE
async function destroy(req, res, next){
    const id = req.params.id;
    const permission = await Permission.findByPk(id);
    if(!permission) res.status(404).json({ message: req.__('permissions.notFound')});
    await permission.destroy();
    res.json({
        message: req.__('permissions.deleted'),
        data: permission
    });
}

module.exports = {list, find, update, destroy, create};