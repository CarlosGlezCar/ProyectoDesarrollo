
const fs = require('node:fs');
const path = require('node:path');

const features = [
  'F01-auth',
  'F02-catalog',
  'F03-product-detail',
  'F04-cart',
  'F05-checkout',
  'F06-my-orders',
  'F07-dashboard',
  'F08-products',
  'F09-variants',
  'F10-inventory',
  'F11-orders',
  'F12-customers',
  'F13-users',
  'F14-roles'
];

const required = [
  'comparacion.png',
  'codigo-fuente.png'
];

const optional = ['movil.png'];

let completed = 0;
let missing = 0;
let mobile = 0;

function validFile(file) {
  return fs.existsSync(file) &&
    fs.statSync(file).isFile() &&
    fs.statSync(file).size > 0;
}

const results = features.map(feature => {

  const folder = path.join(
    'docs',
    'ssr',
    feature
  );

  const result = {
    funcionalidad: feature
  };

  let complete = true;

  for (const name of required) {

    const exists = validFile(
      path.join(folder, name)
    );

    result[name] = exists ? 'OK' : 'FALTA';

    if (!exists) {
      missing++;
      complete = false;
    }
  }

  for (const name of optional) {

    const exists = validFile(
      path.join(folder, name)
    );

    result[name] = exists ? 'OK' : 'OPCIONAL';

    if (exists) mobile++;
  }

  if (complete) completed++;

  return result;
});

console.table(results);

console.log('\n=== EVIDENCIAS SSR ===');
console.log('Funcionalidades completas:', completed + '/14');
console.log('Evidencias obligatorias faltantes:', missing);
console.log('Capturas moviles:', mobile + '/14');

if (missing > 0) {
  process.exitCode = 1;
}
