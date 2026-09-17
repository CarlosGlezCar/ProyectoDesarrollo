//CREATE
function create(req, res, next){
    res.status(201).json({
        message: "Create product",
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

module.exports = {create, update, destroy};