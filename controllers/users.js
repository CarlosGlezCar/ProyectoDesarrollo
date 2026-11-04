const { User, Role } = require('../models/relationals');
const { hashPassword } = require('../utils/passwords');
const { Buffer } = require('node:buffer');

//* CREATE
async function create(req, res, next) {
    try {
        const { name, lastName, email, roleId, password } = req.body || {};

        if (typeof password !== 'string' || password.length === 0) {
            return res.status(400).json({
                message: 'Password is required'
            });
        }

        if (Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({
                message: 'Password exceeds bcrypt limit'
            });
        }

        const { password_hash, salt_key } = await hashPassword(password);

        const user = await User.create({
            first_name: name,
            last_name: lastName,
            email: email,
            role_id: roleId,
            password_hash,
            salt_key
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
        const { name, lastName, email, roleId, password } = req.body || {};

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

        if (password !== undefined) {
            if (typeof password !== 'string' || password.length === 0) {
                return res.status(400).json({
                    message: 'Password is required'
                });
            }

            if (Buffer.byteLength(password, 'utf8') > 72) {
                return res.status(400).json({
                    message: 'Password exceeds bcrypt limit'
                });
            }

            const { password_hash, salt_key } = await hashPassword(password);

            changes.password_hash = password_hash;
            changes.salt_key = salt_key;
        }

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