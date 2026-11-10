const fs = require('fs');
const path = require('path');
const config = require('config');

const ROOT = path.join(__dirname, '..');
const CONFIG_DIR = path.join(ROOT, 'config');

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, file), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function loadPort(port) {
  const previous = process.env.PORT;
  if (port === undefined) delete process.env.PORT;
  else process.env.PORT = port;

  try {
    let cfg;
    jest.isolateModules(() => {
      cfg = require('config');
    });
    return cfg.get('server.port');
  } finally {
    if (previous === undefined) delete process.env.PORT;
    else process.env.PORT = previous;
  }
}

function listSourceFiles(relativePath) {
  const full = path.join(ROOT, relativePath);
  if (!fs.existsSync(full)) return [];

  if (fs.statSync(full).isFile()) return [full];

  return fs.readdirSync(full).flatMap((name) => {
    if (name === 'node_modules') return [];
    const child = path.join(relativePath, name);
    const childFull = path.join(ROOT, child);
    if (fs.statSync(childFull).isDirectory()) return listSourceFiles(child);
    const isCode = name.endsWith('.js') || relativePath === 'bin';
    return isCode ? [childFull] : [];
  });
}

describe('Archivos y entornos de config/', () => {
  test.each(['default.json', 'production.json', 'test.json'])(
    'existe config/%s',
    (file) => {
      expect(fs.existsSync(path.join(CONFIG_DIR, file))).toBe(true);
    }
  );

  test.each([
    'jwt.secret',
    'jwt.issuer',
    'jwt.audience',
    'jwt.expiresIn',
    'i18n.defaultLocale'
  ])('la configuración de pruebas incluye %s sin archivos locales', (key) => {
    expect(config.has(key)).toBe(true);
    expect(config.get(key)).toBeTruthy();
  });

  test.each(['default.json', 'production.json'])(
    'config/%s no contiene jwt.secret (los secretos van fuera de git)',
    (file) => {
      const json = readJson(file);
      expect(json.jwt && json.jwt.secret).toBeUndefined();
    }
  );

  test('existe la plantilla local-development.example.json con jwt.secret', () => {
    const template = readJson('local-development.example.json');
    expect(template.jwt).toBeDefined();
    expect('secret' in template.jwt).toBe(true);
  });

  test.each(['.gitignore', '.dockerignore'])(
    '%s excluye config/local*.json',
    (file) => {
      expect(readText(file)).toMatch(/config\/local/);
    }
  );
});

describe('PORT y server.port', () => {
  test('custom-environment-variables.json enlaza PORT con server.port', () => {
    const mapping = readJson('custom-environment-variables.json').server.port;
    const variable = typeof mapping === 'string' ? mapping : mapping.__name;
    expect(variable).toBe('PORT');
  });

  test('con PORT=8080 el servidor usa el puerto 8080', () => {
    expect(String(loadPort('8080'))).toBe('8080');
  });

  test('sin PORT se usa el puerto por defecto 3000', () => {
    expect(Number(loadPort(undefined))).toBe(3000);
  });
});

describe('Lectura de configuración en el código', () => {
  test('ningún archivo de la aplicación lee process.env directamente', () => {
    const targets = [
      'app.js',
      'bin',
      'routes',
      'controllers',
      'middlewares',
      'models',
      'utils',
      'config',
      'scripts',
      'seeders',
      'seed'
    ];

    const offenders = targets
      .flatMap(listSourceFiles)
      .filter((file) => /process\.env/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(ROOT, file));

    expect(offenders).toEqual([]);
  });
});

describe('Scripts de npm', () => {
  test('npm test usa Jest y excluye las pruebas E2E', () => {
    const pkg = JSON.parse(readText('package.json'));
    expect(pkg.scripts.test).toMatch(/jest/);
    expect(pkg.scripts.test).toMatch(/e2e/);
  });
});