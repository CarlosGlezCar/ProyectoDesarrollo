
const fs = require('node:fs');
const path = require('node:path');

const es = require('../locales/es.json');
const en = require('../locales/en.json');

function getValue(dictionary, key) {
  return key.split('.').reduce(
    (value, part) => value?.[part],
    dictionary
  );
}

function existsKey(dictionary, key) {
  return typeof getValue(dictionary, key) === 'string';
}

function getLeafKeys(object, prefix = '') {
  if (typeof object === 'string') {
    return [prefix];
  }

  if (!object || typeof object !== 'object') {
    return [];
  }

  return Object.entries(object).flatMap(
    ([key, value]) => getLeafKeys(
      value,
      prefix ? `${prefix}.${key}` : key
    )
  );
}

let files = 0;
let staticKeys = 0;
let dynamicKeys = 0;
let errors = 0;

const dynamicGroups = new Set();

function reportError(file, key, missing) {
  errors++;

  console.log(
    file,
    key,
    'FALTA:',
    missing.join(', ')
  );
}

function checkStaticKey(file, key) {
  staticKeys++;

  const missing = [];

  if (!existsKey(es, key)) missing.push('ES');
  if (!existsKey(en, key)) missing.push('EN');

  if (missing.length) {
    reportError(file, key, missing);
  }
}

function checkDynamicGroup(key) {

  // Eliminar el punto final de la clave dinamica
  const prefix = key.replace(/\.$/, '');

  const spanish = getValue(es, prefix);
  const english = getValue(en, prefix);

  const spanishKeys = getLeafKeys(spanish);
  const englishKeys = getLeafKeys(english);

  const keys = new Set([
    ...spanishKeys,
    ...englishKeys
  ]);

  if (keys.size === 0) {
    reportError('Grupo dinamico', prefix, ['ES', 'EN']);
    return;
  }

  for (const suffix of keys) {
    checkStaticKey(
      'Grupo dinamico',
      `${prefix}.${suffix}`
    );
  }
}

function audit(directory) {

  for (const entry of fs.readdirSync(directory, {
    withFileTypes: true
  })) {

    const file = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      audit(file);
      continue;
    }

    if (!file.endsWith('.pug')) {
      continue;
    }

    files++;

    const content = fs.readFileSync(file, 'utf8');

    const pattern = /__\(\s*(['"])([^'"]+)\1/g;

    for (const match of content.matchAll(pattern)) {

      const key = match[2];

      const remaining = content.slice(
        match.index + match[0].length
      );

      if (
        key.endsWith('.') &&
        /^\s*\+/.test(remaining)
      ) {
        dynamicKeys++;
        dynamicGroups.add(key);
        continue;
      }

      checkStaticKey(file, key);
    }
  }
}

audit('views');

console.log('\n=== GRUPOS DINAMICOS ===');

for (const group of dynamicGroups) {
  console.log('Revisando:', group);
  checkDynamicGroup(group);
}

// Comprobar valores obligatorios conocidos
const requiredGroups = {
  'ssr.dashboard.status': [
    'pending',
    'paid',
    'shipped',
    'delivered',
    'cancelled'
  ],
  'ssr.checkout.payment': [
    'cash',
    'card',
    'transfer'
  ],
  'ssr.adminRoles.permissionActions': [
    'create',
    'read',
    'update',
    'delete'
  ],
  'ssr.adminRoles.scopes': [
    'own',
    'any'
  ]
};

for (const [prefix, values] of Object.entries(requiredGroups)) {
  for (const value of values) {
    checkStaticKey(
      'Valor obligatorio',
      `${prefix}.${value}`
    );
  }
}

console.log('\n=== AUDITORIA DE VISTAS ===');
console.log('Plantillas revisadas:', files);
console.log('Claves verificadas:', staticKeys);
console.log('Referencias dinamicas:', dynamicKeys);
console.log('Grupos dinamicos:', dynamicGroups.size);
console.log('Traducciones faltantes:', errors);

if (errors > 0) {
  process.exitCode = 1;
}
