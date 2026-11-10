const i18n = require('../config/i18n');

const inputErrors = new Set([
    'ValidationError',
    'StrictModeError',
    'SequelizeValidationError',
    'SequelizeForeignKeyConstraintError'
]);

const inputCodes = new Set([
    '22P02', '22003', '22001', '22007',
    '22008', '23502', '23503', '23514', '121'
]);

function errorHandler(err, req, res, next) {
    if (res.headersSent) return next(err);

    const receivedStatus = err.status || err.statusCode;
    let status = Number.isInteger(receivedStatus)
        && receivedStatus >= 400 && receivedStatus <= 599
        ? receivedStatus
        : 500;

    const messages = {
        400: 'common.invalidData',
        401: 'common.unauthorized',
        403: 'common.forbidden',
        404: 'common.notFound',
        409: 'common.conflict'
    };
    let messageKey = status >= 500
        ? 'common.internalError'
        : messages[status] || 'common.badRequest';

    const code = String(err.original?.code ?? err.parent?.code ?? err.code ?? '');

    if (err.name === 'UnauthorizedError') {
        status = 401;
        messageKey = err.inner?.name === 'TokenExpiredError'
            ? 'auth.tokenExpired'
            : err.code === 'credentials_required'
                ? 'auth.tokenRequired'
                : 'auth.invalidToken';
    } else if (err.name === 'SequelizeUniqueConstraintError'
        || code === '11000' || code === '23505') {
        status = 400;
        messageKey = 'common.duplicate';
    } else if (err.name === 'CastError') {
        status = 400;
        messageKey = err.path === '_id' || err.kind === 'ObjectId'
            ? 'common.invalidId'
            : 'common.invalidData';
    } else if (inputErrors.has(err.name) || inputCodes.has(code)) {
        status = 400;
        messageKey = 'common.invalidData';
    } else if (err.name === 'DocumentNotFoundError') {
        status = 404;
        messageKey = 'common.notFound';
    } else if (err.name === 'VersionError') {
        status = 409;
        messageKey = 'common.conflict';
    } else if (err.type === 'entity.parse.failed') {
        status = 400;
        messageKey = 'common.badRequest';
    }

    const message = typeof req.__ === 'function'
        ? req.__(messageKey)
        : i18n.__(messageKey);

    const isApi = req.path === '/api' || req.path.startsWith('/api/');
    if (isApi || err.name === 'UnauthorizedError') {
        return res.status(status).json({ message, data: null });
    }

    res.locals.message = message;
    res.locals.error = req.app.get('env') === 'development' ? err : { status };
    return res.status(status).render('error');
}

module.exports = errorHandler;