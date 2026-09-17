//CREATE
function create(req, res, next){
    res.status(201).json({
        message: "create a new product variant",
        data: {}
    });
}

//READ
function list(req, res, next) {
    res.json({
        message: "List current product variants",
        data: []
    });
}

function find(req, res, next){
    res.json({
        message: "Product variant by id",
        data: {}
    });
}

//UPDATE
function update(req, res, next){
    res.json({
        message: "Update product variant",
        data: {}
    });
}

//DELETE
function destroy(req, res, next){
    res.json({
        message: "Delete a product variant",
        data: {}
    });
}

module.exports = {list, create, find, update, destroy};