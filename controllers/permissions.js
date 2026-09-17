//READ
function list(req, res, next) {
    res.json({
        message: "Show users type of permissions",
        data: []
    });
}

function find(req, res, next){
    res.json({
        message: "Show certain user permissions",
        data: {}
    });
}

//UPDATE
function update(req, res, next){
    res.json({
        message: "Update user permissions",
        data: {}
    });
}

//DELETE
function destroy(req, res, next){
    res.json({
        message: "Remove a user permission",
        data: {}
    });
}

module.exports = {list, find, update, destroy};