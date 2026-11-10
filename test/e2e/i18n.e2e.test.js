const { api, login, bearer } = require('./helpers');
const es = require('../../locales/es.json');
const en = require('../../locales/en.json');

describe('Internacionalización (i18n) E2E', () => {
  let adminToken;
  let userToken;

  beforeAll(async () => {
    adminToken = await login('ADMIN');
    userToken = await login('USER');
  });

  test('1. ADMIN GET /api/products responde con products.list en es y en en', async () => {
    expect(es.products.list).not.toBe(en.products.list);

    const resEs = await api()
      .get('/api/products')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    const resEn = await api()
      .get('/api/products')
      .set('Accept-Language', 'en')
      .set(bearer(adminToken));

    expect(resEs.statusCode).toBe(200);
    expect(resEn.statusCode).toBe(200);
    expect(resEs.body.message).toBe(es.products.list);
    expect(resEn.body.message).toBe(en.products.list);
    expect(resEs.body.message).not.toBe(resEn.body.message);
  });

  test('2. ADMIN GET /api/products/999999 responde 404 con products.notFound en es y en en', async () => {
    expect(es.products.notFound).not.toBe(en.products.notFound);

    const resEs = await api()
      .get('/api/products/999999')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    const resEn = await api()
      .get('/api/products/999999')
      .set('Accept-Language', 'en')
      .set(bearer(adminToken));

    expect(resEs.statusCode).toBe(404);
    expect(resEn.statusCode).toBe(404);
    expect(resEs.body.message).toBe(es.products.notFound);
    expect(resEn.body.message).toBe(en.products.notFound);
    expect(resEs.body.message).not.toBe(resEn.body.message);
  });

  test('3. GET /api/auth/me sin token responde 401 con auth.tokenRequired en es y en en', async () => {
    expect(es.auth.tokenRequired).not.toBe(en.auth.tokenRequired);

    const resEs = await api()
      .get('/api/auth/me')
      .set('Accept-Language', 'es');

    const resEn = await api()
      .get('/api/auth/me')
      .set('Accept-Language', 'en');

    expect(resEs.statusCode).toBe(401);
    expect(resEn.statusCode).toBe(401);
    expect(resEs.body.message).toBe(es.auth.tokenRequired);
    expect(resEn.body.message).toBe(en.auth.tokenRequired);
    expect(resEs.body.message).not.toBe(resEn.body.message);
  });

  test('4. USER DELETE /api/products/1 responde 403 con common.forbidden en es y en en', async () => {
    expect(es.common.forbidden).not.toBe(en.common.forbidden);

    const resEs = await api()
      .delete('/api/products/1')
      .set('Accept-Language', 'es')
      .set(bearer(userToken));

    const resEn = await api()
      .delete('/api/products/1')
      .set('Accept-Language', 'en')
      .set(bearer(userToken));

    expect(resEs.statusCode).toBe(403);
    expect(resEn.statusCode).toBe(403);
    expect(resEs.body.message).toBe(es.common.forbidden);
    expect(resEn.body.message).toBe(en.common.forbidden);
    expect(resEs.body.message).not.toBe(resEn.body.message);
  });

  test('5. GET /api/no-existe responde 404 con common.notFound en es y en en', async () => {
    expect(es.common.notFound).not.toBe(en.common.notFound);

    const resEs = await api()
      .get('/api/no-existe')
      .set('Accept-Language', 'es');

    const resEn = await api()
      .get('/api/no-existe')
      .set('Accept-Language', 'en');

    expect(resEs.statusCode).toBe(404);
    expect(resEn.statusCode).toBe(404);
    expect(resEs.body.message).toBe(es.common.notFound);
    expect(resEn.body.message).toBe(en.common.notFound);
    expect(resEs.body.message).not.toBe(resEn.body.message);
  });

  test('6. ?lang=en con Accept-Language: es responde en inglés, y ?lang=es con Accept-Language: en responde en español', async () => {
    expect(es.products.notFound).not.toBe(en.products.notFound);

    const resEn = await api()
      .get('/api/products/999999?lang=en')
      .set('Accept-Language', 'es')
      .set(bearer(adminToken));

    const resEs = await api()
      .get('/api/products/999999?lang=es')
      .set('Accept-Language', 'en')
      .set(bearer(adminToken));

    expect(resEn.statusCode).toBe(404);
    expect(resEs.statusCode).toBe(404);
    expect(resEn.body.message).toBe(en.products.notFound);
    expect(resEs.body.message).toBe(es.products.notFound);
    expect(resEn.body.message).not.toBe(resEs.body.message);
  });

  test('7. Accept-Language: es-MX responde en español y en-US en inglés', async () => {
    expect(es.products.notFound).not.toBe(en.products.notFound);

    const resEsMx = await api()
      .get('/api/products/999999')
      .set('Accept-Language', 'es-MX')
      .set(bearer(adminToken));

    const resEnUs = await api()
      .get('/api/products/999999')
      .set('Accept-Language', 'en-US')
      .set(bearer(adminToken));

    expect(resEsMx.statusCode).toBe(404);
    expect(resEnUs.statusCode).toBe(404);
    expect(resEsMx.body.message).toBe(es.products.notFound);
    expect(resEnUs.body.message).toBe(en.products.notFound);
    expect(resEsMx.body.message).not.toBe(resEnUs.body.message);
  });

  test('8. Accept-Language: fr responde en español, que es el idioma por defecto', async () => {
    const response = await api()
      .get('/api/products/999999')
      .set('Accept-Language', 'fr')
      .set(bearer(adminToken));

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe(es.products.notFound);
  });

  test('9. Sin Accept-Language ni ?lang responde en el idioma por defecto (es)', async () => {
    const response = await api()
      .get('/api/products/999999')
      .set(bearer(adminToken));

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe(es.products.notFound);
  });

  test('10. GET / con ?lang=es y con ?lang=en devuelve HTML que contiene el texto views.home.title del idioma correspondiente', async () => {
    const resEs = await api().get('/?lang=es');
    const resEn = await api().get('/?lang=en');

    expect(resEs.statusCode).toBe(200);
    expect(resEn.statusCode).toBe(200);
    expect(resEs.headers['content-type']).toMatch(/html/);
    expect(resEn.headers['content-type']).toMatch(/html/);

    const expectedEsTitle = es.views.home.title.replace('&', '&amp;');
    const expectedEnTitle = en.views.home.title.replace('&', '&amp;');

    expect(resEs.text).toContain(expectedEsTitle);
    expect(resEn.text).toContain(expectedEnTitle);
    expect(resEs.text.replace(/&amp;/g, '&')).toContain(es.views.home.title);
    expect(resEn.text.replace(/&amp;/g, '&')).toContain(en.views.home.title);
  });
});
