//CREATE
function create(req, res, next){
    res.status(201).json({
        message: "Create an order",
        data: {}
    });
}

function find(req, res, next){
    res.json({
        message: "Track order by id",
        data: {}
    });
}

//UPDATE
function update(req, res, next){
    res.json({
        message: "Update order status",
        data: {}
    });
}

//DELETE
function destroy(req, res, next){
    res.json({
        message: "Remove an order",
        data: {}
    });
}

module.exports = {create, find, update, destroy};