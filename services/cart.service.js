
const variantService = require('./variant.service');
const { isSqlId } = require('../utils/validation');

const MAX_LINES = 20;
const MAX_QUANTITY = 99;

// Validar cantidades
function validQuantity(value) {
  return typeof value === 'string' &&
    /^[1-9]\d*$/.test(value) &&
    Number(value) <= MAX_QUANTITY;
}

// Leer y limpiar la cookie
function readCart(raw) {
  if (typeof raw !== 'string' || raw.length > 3500) {
    return [];
  }

  try {
    const data = JSON.parse(raw);

    if (!Array.isArray(data)) {
      return [];
    }

    const items = new Map();

    for (const item of data) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      if (
        !isSqlId(String(item.variantId)) ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > MAX_QUANTITY
      ) {
        continue;
      }

      const variantId = Number(item.variantId);

      items.set(variantId, {
        variantId,
        quantity: item.quantity
      });

      if (items.size >= MAX_LINES) {
        break;
      }
    }

    return [...items.values()];

  } catch {
    return [];
  }
}

// Obtener informacion real de una variante
async function resolveLine(item) {
  const variant = await variantService.findById(
    item.variantId
  );

  if (
    !variant ||
    !variant.active ||
    !variant.product ||
    !variant.product.active
  ) {
    return {
      ...item,
      valid: false,
      available: 0,
      name: null,
      unitPriceCents: 0,
      subtotalCents: 0
    };
  }

  const stock = Number(variant.inventory?.stock ?? 0);
  const reserved = Number(variant.inventory?.reserved ?? 0);

  const available = Math.max(0, stock - reserved);

  // Trabajar en centavos para calcular los importes
  const unitPriceCents = Math.round(
    Number(variant.product.price) * 100
  );

  if (
    !Number.isSafeInteger(unitPriceCents) ||
    unitPriceCents < 0
  ) {
    throw new Error('Invalid product price');
  }

  return {
    ...item,
    productId: variant.product_id,
    sku: variant.sku,
    size: variant.size,
    color: variant.color,
    name: variant.product.name,
    available,
    unitPriceCents,
    subtotalCents: unitPriceCents * item.quantity,
    valid: item.quantity <= available
  };
}

// Preparar toda la bolsa para mostrarla
async function getCart(items) {
  const lines = await Promise.all(
    items.map(resolveLine)
  );

  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.subtotalCents,
    0
  );

  const count = lines.reduce(
    (sum, line) => sum + line.quantity,
    0
  );

  return {
    lines,
    count,
    subtotalCents,
    shippingCents: 0,
    totalCents: subtotalCents,
    canCheckout:
      lines.length > 0 &&
      lines.every(line => line.valid)
  };
}

// Agregar o actualizar una variante
async function changeQuantity(
  items,
  variantId,
  quantity,
  adding = false
) {
  const existing = items.find(
    item => item.variantId === variantId
  );

  if (!adding && !existing) {
    return {
      status: 404,
      error: 'ssr.cart.notFound'
    };
  }

  if (adding && !existing && items.length >= MAX_LINES) {
    return {
      status: 400,
      error: 'ssr.cart.cartLimit'
    };
  }

  const newQuantity = adding
    ? (existing?.quantity ?? 0) + quantity
    : quantity;

  if (newQuantity > MAX_QUANTITY) {
    return {
      status: 400,
      error: 'ssr.cart.invalidQuantity'
    };
  }

  const line = await resolveLine({
    variantId,
    quantity: newQuantity
  });

  if (!line.name) {
    return {
      status: 400,
      error: 'ssr.cart.unavailable'
    };
  }

  if (!line.valid) {
    return {
      status: 400,
      error: 'ssr.cart.insufficientStock'
    };
  }

  const updated = items.filter(
    item => item.variantId !== variantId
  );

  updated.push({
    variantId,
    quantity: newQuantity
  });

  return {
    items: updated
  };
}

// Eliminar un articulo
function removeItem(items, variantId) {
  return items.filter(
    item => item.variantId !== variantId
  );
}

module.exports = {
  readCart,
  validQuantity,
  resolveLine,
  getCart,
  changeQuantity,
  removeItem
};