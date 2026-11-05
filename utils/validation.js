const createError = require('http-errors');

const MAX_SQL_ID = 2147483647;

function isPositiveInteger(value) {
    return Number.isInteger(value) && value >= 1 && value <= MAX_SQL_ID;
}

function isSqlId(value) {
    return typeof value === 'string'
        && /^[1-9]\d{0,9}$/.test(value)
        && isPositiveInteger(Number(value));
}

function isMongoId(value) {
    return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

function readBody(body, allowedFields, requiredFields = []) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw createError(400);
    }

    const prototype = Object.getPrototypeOf(body);
    if (prototype !== Object.prototype && prototype !== null) {
        throw createError(400);
    }

    const keys = Object.keys(body);
    if (keys.length === 0 || keys.some(key => !allowedFields.includes(key))) {
        throw createError(400);
    }

    if (requiredFields.some(key => !Object.hasOwn(body, key) || body[key] == null)) {
        throw createError(400);
    }

    return { ...body };
}

function checkTypes(body, fields, type) {
    for (const field of fields) {
        if (Object.hasOwn(body, field) && typeof body[field] !== type) {
            throw createError(400);
        }
    }
}

function checkIds(body, fields) {
    for (const field of fields) {
        if (Object.hasOwn(body, field) && !isPositiveInteger(body[field])) {
            throw createError(400);
        }
    }
}

function readIdList(value) {
    if (!Array.isArray(value)) throw createError(400);

    for (const id of value) {
        if (!isPositiveInteger(id)) throw createError(400);
    }

    return [...new Set(value)];
}

module.exports = {
    isPositiveInteger,
    isSqlId,
    isMongoId,
    readBody,
    checkTypes,
    checkIds,
    readIdList
};