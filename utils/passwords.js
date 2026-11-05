const bcrypt = require('bcrypt');
const config = require('config');

async function hashPassword(password) {
    const saltRounds = Number(config.get('bcrypt.saltRounds'));

    if (!Number.isInteger(saltRounds) || saltRounds < 4 || saltRounds > 31) {
        throw new Error('bcrypt.saltRounds debe ser un entero entre 4 y 31');
    }

    const salt_key = await bcrypt.genSalt(saltRounds);
    const password_hash = await bcrypt.hash(password, salt_key);

    return { password_hash, salt_key };
}

async function verifyPassword(password, passwordHash) {
    if (typeof password !== 'string' || typeof passwordHash !== 'string') {
        return false;
    }

    return await bcrypt.compare(password, passwordHash);
}

module.exports = {
    hashPassword,
    verifyPassword
};