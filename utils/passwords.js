const bcrypt = require('bcrypt');
const config = require('config');
const { Buffer } = require('node:buffer');

async function hashPassword(password) {
    if (typeof password !== 'string' || !password
        || Buffer.byteLength(password, 'utf8') > 72) {
        throw new Error('La contraseña debe contener entre 1 y 72 bytes.');
    }

    const saltRounds = config.get('bcrypt.saltRounds');

    if (!Number.isInteger(saltRounds) || saltRounds < 4 || saltRounds > 31) {
        throw new Error('bcrypt.saltRounds debe ser un entero entre 4 y 31.');
    }

    const salt_key = await bcrypt.genSalt(saltRounds);
    const password_hash = await bcrypt.hash(password, salt_key);

    return { password_hash, salt_key };
}

async function verifyPassword(password, passwordHash) {
    if (typeof password !== 'string' || !password
        || typeof passwordHash !== 'string'
        || Buffer.byteLength(password, 'utf8') > 72) {
        return false;
    }

    return bcrypt.compare(password, passwordHash);
}

module.exports = {
    hashPassword,
    verifyPassword
};