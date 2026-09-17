//CREATE
function create(req, res, next){
    res.status(201).json({
        message: "Add a new customer",
        data: {}
    });
}

//READ
function list(req, res, next) {
    res.json({
        message: "Show customer list",
        data: []
    });
}

function find(req, res, next){
    res.json({
        message: "Find customer by id",
        data: {}
    });
}

//UPDATE
function update(req, res, next){
    res.json({
        message: "Update customer info",
        data: {}
    });
}

//DELETE
function destroy(req, res, next){
    res.json({
        message: "Remove a customer",
        data: {}
    });
}

module.exports = {list, create, find, update, destroy};