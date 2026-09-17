//CREATE
function create(req, res, next){
    res.status(201).json({
        message: "Create product",
        data: {}
    });
}

//READ
function list(req, res, next) {
    res.json({
        message: "List of current products",
        data: []
    });
}

function find(req, res, next){
    res.json({
        message: "Product by id",
        data: {}
    });
}

//UPDATE
function update(req, res, next){
    res.json({
        message: "Update product info",
        data: {}
    });
}

//DELETE
function destroy(req, res, next){
    res.json({
        message: "Delete a product",
        data: {}
    });
}

module.exports = {list, create, find, update, destroy};