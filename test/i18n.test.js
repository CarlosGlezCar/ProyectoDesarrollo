const es = require('../locales/es.json');
const en = require('../locales/en.json');

function getKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object') {
      return getKeys(value, path);
    }

    return [path];
  }).sort();
}

describe('Internacionalización', () => {
  test('Español e inglés tienen las mismas claves', () => {
    expect(getKeys(es)).toEqual(getKeys(en));
  });

  test('Existe la traducción de productos', () => {
    expect(es.products.created).toBeDefined();
    expect(en.products.created).toBeDefined();

    expect(es.products.created)
      .not.toBe(en.products.created);
  });
});
