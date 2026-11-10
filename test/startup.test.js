const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WWW = path.join(ROOT, 'bin', 'www');
const MENSAJE = 'falta jwt.secret';

jest.setTimeout(30000);

function runServer(env, { stopWhen } = {}) {
  return new Promise((resolve, reject) => {
    const base = { ...process.env };
    delete base.NODE_CONFIG;
    delete base.NODE_APP_INSTANCE;
    delete base.PORT;

    const child = spawn(process.execPath, [WWW], {
      cwd: ROOT,
      env: { ...base, ...env }
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 15000);

    child.stdout.on('data', (data) => {
      stdout += data;
      if (stopWhen && stopWhen(stdout)) child.kill();
    });
    child.stderr.on('data', (data) => {
      stderr += data;
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

describe('Arranque del servidor (bin/www)', () => {
  test('sin jwt.secret el servidor termina con código 1 y un mensaje claro', async () => {
    const result = await runServer({ NODE_ENV: 'sin-secreto' });

    expect(result.timedOut).toBe(false);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain(MENSAJE);
  });

  test('con jwt.secret vacío el servidor también se niega a arrancar', async () => {
    const result = await runServer({
      NODE_ENV: 'sin-secreto',
      NODE_CONFIG: JSON.stringify({ jwt: { secret: '' } })
    });

    expect(result.timedOut).toBe(false);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain(MENSAJE);
  });

  test('sin jwt.secret no intenta conectarse a las bases de datos', async () => {
    const result = await runServer({ NODE_ENV: 'sin-secreto' });

    expect(result.stdout).not.toContain('Conectando a MongoDB');
    expect(result.stdout).not.toContain('Conectando a PostgreSQL');
  });

  test('con la configuración de pruebas (jwt.secret presente) pasa la validación', async () => {
    const result = await runServer(
      { NODE_ENV: 'test' },
      { stopWhen: (out) => out.includes('Conectando a MongoDB') }
    );

    expect(result.timedOut).toBe(false);
    expect(result.stdout).toContain('Conectando a MongoDB');
    expect(result.stderr).not.toContain(MENSAJE);
  });
});