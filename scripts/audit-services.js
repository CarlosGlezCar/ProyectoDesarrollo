
const fs = require('node:fs');
const path = require('node:path');

const checks = [
  {
    controller: 'controllers/auth.js',
    service: 'auth.service'
  },
  {
    controller: 'controllers/web/auth.js',
    service: 'auth.service'
  },
  {
    controller: 'controllers/products.js',
    service: 'product.service'
  },
  {
    controller: 'controllers/web/store.js',
    service: 'product.service'
  },
  {
    controller: 'controllers/web/admin.js',
    service: 'product.service'
  },
  {
    controller: 'controllers/variants.js',
    service: 'variant.service'
  },
  {
    controller: 'controllers/inventory.js',
    service: 'inventory.service'
  },
  {
    controller: 'controllers/customers.js',
    service: 'customer.service'
  },
  {
    controller: 'controllers/web/admin-customers.js',
    service: 'customer.service'
  },
  {
    controller: 'controllers/orders.js',
    service: 'order.service'
  },
  {
    controller: 'controllers/web/admin-orders.js',
    service: 'order.service'
  },
  {
    controller: 'controllers/users.js',
    service: 'user.service'
  },
  {
    controller: 'controllers/web/admin-users.js',
    service: 'user.service'
  },
  {
    controller: 'controllers/roles.js',
    service: 'role.service'
  },
  {
    controller: 'controllers/web/admin-roles.js',
    service: 'role.service'
  }
];

const results = checks.map(check => {

  const file = path.join(
    process.cwd(),
    check.controller
  );

  if (!fs.existsSync(file)) {
    return {
      controlador: check.controller,
      servicio: check.service,
      resultado: 'ARCHIVO NO ENCONTRADO'
    };
  }

  const content = fs.readFileSync(file, 'utf8');

  return {
    controlador: check.controller,
    servicio: check.service,

    resultado: content.includes(check.service)
      ? 'OK'
      : 'REVISAR'
  };

});

console.table(results);

// Buscar operaciones directas sobre los modelos
const pattern =
  /\b(User|Role|Permission|Product|ProductVariant|Inventory|Customer|Order)\.(findAll|findOne|findByPk|findById|findByIdAndUpdate|findByIdAndDelete|findOneAndUpdate|findOneAndDelete|create|update|destroy|count|countDocuments|exists)\s*\(/g;

console.log('\n=== CONSULTAS DIRECTAS EN CONTROLADORES ===');

function auditDirectory(directory) {

  const entries = fs.readdirSync(directory, {
    withFileTypes: true
  });

  for (const entry of entries) {

    const file = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      auditDirectory(file);
      continue;
    }

    if (!file.endsWith('.js')) {
      continue;
    }

    const content = fs.readFileSync(file, 'utf8');

    content.split(/\r?\n/).forEach((line, index) => {

      const matches = [...line.matchAll(pattern)];

      for (const match of matches) {
        console.log(
          `${file}:${index + 1} -> ${match[1]}.${match[2]}()`
        );
      }

    });

  }

}

auditDirectory('controllers');
