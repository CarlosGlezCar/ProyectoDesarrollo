
const path = require('path');
const i18n = require('i18n');
const config = require('config');

i18n.configure({
    locales: ['es', 'en'],
    defaultLocale: config.get('i18n.defaultLocale'),
    directory: path.join(__dirname, '..', 'locales'),
    queryParameter: 'lang',
    header: 'accept-language',
    objectNotation: true,
    retryInDefaultLocale: true,
    updateFiles: false
});

module.exports = i18n;