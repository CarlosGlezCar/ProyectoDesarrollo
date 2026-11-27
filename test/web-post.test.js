
const express = require('express');
const request = require('supertest');

const webPost = require('../middlewares/web-post');

const app = express();

app.post('/test', webPost, (req, res) => {
  return res.sendStatus(200);
});

describe('Proteccion de formularios web', () => {

  test('Permite solicitudes del mismo origen', async () => {
    await request(app)
      .post('/test')
      .set('Host', 'stride.local')
      .set('Origin', 'http://stride.local')
      .set('Sec-Fetch-Site', 'same-origin')
      .expect(200);
  });

  test('Rechaza solicitudes cross-site', async () => {
    await request(app)
      .post('/test')
      .set('Sec-Fetch-Site', 'cross-site')
      .expect(403);
  });

  test('Rechaza solicitudes de otros subdominios', async () => {
    await request(app)
      .post('/test')
      .set('Sec-Fetch-Site', 'same-site')
      .expect(403);
  });

  test('Rechaza un Origin externo', async () => {
    await request(app)
      .post('/test')
      .set('Host', 'stride.local')
      .set('Origin', 'https://example.com')
      .expect(403);
  });

  test('Rechaza un protocolo diferente', async () => {
    await request(app)
      .post('/test')
      .set('Host', 'stride.local')
      .set('Origin', 'https://stride.local')
      .expect(403);
  });

  test('Rechaza un Origin invalido', async () => {
    await request(app)
      .post('/test')
      .set('Origin', 'null')
      .expect(403);
  });

  test('Permite Referer del mismo origen', async () => {
    await request(app)
      .post('/test')
      .set('Host', 'stride.local')
      .set('Referer', 'http://stride.local/admin')
      .expect(200);
  });

  test('Rechaza Referer externo', async () => {
    await request(app)
      .post('/test')
      .set('Host', 'stride.local')
      .set('Referer', 'https://example.com/form')
      .expect(403);
  });

  test('Mantiene compatibilidad con clientes sin cabeceras de origen', async () => {
    await request(app)
      .post('/test')
      .expect(200);
  });

  test('Acepta HTTPS en produccion', async () => {
    app.set('env', 'production');

    try {
      await request(app)
        .post('/test')
        .set('Host', 'stride.local')
        .set('Origin', 'https://stride.local')
        .expect(200);
    } finally {
      app.set('env', 'test');
    }
  });

});
