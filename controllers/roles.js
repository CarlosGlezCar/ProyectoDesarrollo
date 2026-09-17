//READ
function list(req, res, next) {
    res.json({
        message: "All users roles",
        data: []
    });
}

function find(req, res, next){
    res.json({
        message: "This user id role",
        data: {}
    });
}

//UPDATE
function update(req, res, next){
    res.json({
        message: "Update user role",
        data: {}
    });
}

module.exports = {list, find, update};