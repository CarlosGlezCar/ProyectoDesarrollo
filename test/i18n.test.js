const request = require('supertest');
const config = require('config');
const app = require('../app');
const es = require('../locales/es.json');
const en = require('../locales/en.json');

const DEFAULT_LOCALE = config.get('i18n.defaultLocale');
const LOCALES = { es, en };
const KEY = 'credentialsRequired';

function login(url = '/api/auth/login') {
  return request(app).post(url).send({});
}

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object'
      ? flatten(value, path)
      : [[path, value]];
  });
}

describe('Detección de idioma', () => {
  test('los textos de es y en son distintos (la prueba distingue idiomas)', () => {
    expect(es.auth[KEY]).not.toBe(en.auth[KEY]);
  });

  test('?lang=es responde en español', async () => {
    const res = await login('/api/auth/login?lang=es');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(es.auth[KEY]);
  });

  test('?lang=en responde en inglés', async () => {
    const res = await login('/api/auth/login?lang=en');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(en.auth[KEY]);
  });

  test('Accept-Language: es responde en español', async () => {
    const res = await login().set('Accept-Language', 'es');
    expect(res.body.message).toBe(es.auth[KEY]);
  });

  test('Accept-Language: en responde en inglés', async () => {
    const res = await login().set('Accept-Language', 'en');
    expect(res.body.message).toBe(en.auth[KEY]);
  });

  test.each([
    ['es-MX', es],
    ['en-US', en],
    ['es-MX,es;q=0.9,en;q=0.8', es],
    ['EN', en]
  ])('la variante regional o con mayúsculas "%s" se resuelve al idioma base', async (header, locale) => {
    const res = await login().set('Accept-Language', header);
    expect(res.body.message).toBe(locale.auth[KEY]);
  });

  test('?lang tiene prioridad sobre Accept-Language', async () => {
    const res = await login('/api/auth/login?lang=en').set('Accept-Language', 'es');
    expect(res.body.message).toBe(en.auth[KEY]);
  });

  test('un idioma no soportado en Accept-Language (fr) usa el idioma por defecto', async () => {
    const res = await login().set('Accept-Language', 'fr');
    expect(res.body.message).toBe(LOCALES[DEFAULT_LOCALE].auth[KEY]);
  });

  test('un idioma no soportado en ?lang (fr) usa el idioma por defecto', async () => {
    const res = await login('/api/auth/login?lang=fr');
    expect(res.body.message).toBe(LOCALES[DEFAULT_LOCALE].auth[KEY]);
  });

  test('sin ?lang ni Accept-Language usa el idioma por defecto', async () => {
    const res = await login();
    expect(res.body.message).toBe(LOCALES[DEFAULT_LOCALE].auth[KEY]);
  });
});

describe('Archivos de idioma', () => {
  test('es.json y en.json tienen exactamente las mismas claves', () => {
    const esKeys = flatten(es).map(([key]) => key).sort();
    const enKeys = flatten(en).map(([key]) => key).sort();

    expect(enKeys).toEqual(esKeys);
  });

  test('ninguna traducción está vacía ni es solo espacios', () => {
    [['es', es], ['en', en]].forEach(([name, locale]) => {
      flatten(locale).forEach(([key, value]) => {
        expect([name, key, typeof value]).toEqual([name, key, 'string']);
        expect([name, key, value.trim().length > 0]).toEqual([name, key, true]);
      });
    });
  });
});