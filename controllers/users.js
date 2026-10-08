const { User, Role } = require('../models/relationals');

//* CREATE
async function create(req, res, next) {
    try {
        const { name, lastName, email, roleId } = req.body;

        const user = await User.create({
            first_name: name,
            last_name: lastName,
            email: email,
            role_id: roleId
        });

        res.status(201).json({
            message: 'User created',
            data: user
        });

    } catch (err) {
        next(err);
    }
}

//* READ ALL
async function list(req, res, next) {
    try {
        const users = await User.findAll({
            include: {
                model: Role,
                as: 'role'
            }
        });

        res.json({
            message: 'Users list',
            data: users
        });

    } catch (err) {
        next(err);
    }
}

//* READ BY ID
async function find(req, res, next) {
    try {
        const id = req.params.id;

        const user = await User.findByPk(id, {
            include: {
                model: Role,
                as: 'role'
            }
        });

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        res.json({
            message: 'User by id',
            data: user
        });

    } catch (err) {
        next(err);
    }
}

//* UPDATE
async function update(req, res, next) {
    try {
        const id = req.params.id;

        const { name, lastName, email, roleId } = req.body;

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        const changes = {
            first_name: name ?? user.first_name,
            last_name: lastName ?? user.last_name,
            email: email ?? user.email,
            role_id: roleId ?? user.role_id
        };

        await user.update(changes);

        res.json({
            message: 'User updated',
            data: user
        });

    } catch (err) {
        next(err);
    }
}

//* DELETE
async function destroy(req, res, next) {
    try {
        const id = req.params.id;

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        await user.destroy();

        res.json({
            message: 'User deleted',
            data: user
        });

    } catch (err) {
        next(err);
    }
}

module.exports = {
    list,
    create,
    find,
    update,
    destroy
};