//READ
function list(req, res, next) {
    res.json({
        message: "Show inventory",
        data: []
    });
}

function find(req, res, next){
    res.json({
        message: "Show a product in inventory by id",
        data: {}
    });
}

//UPDATE
function update(req, res, next){
    res.json({
        message: "Update inventory",
        data: {}
    });
}
module.exports = {list, create, find, update, destroy};