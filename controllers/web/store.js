const createError = require('http-errors');
const { URLSearchParams } = require('node:url');

const productService = require('../../services/product.service');

function categoryData(req) {
  const categories = productService.getCategories().map(category => ({
    id: category.id,
    name: req.__(`ssr.categories.${category.key}`)
  }));

  function categoryLabel(id) {
    const category = categories.find(
      item => item.id === Number(id)
    );

    return category
      ? category.name
      : req.__('ssr.categories.other');
  }

  return {
    categories,
    categoryLabel
  };
}

async function home(req, res, next) {
  try {
    const products = await productService.featured();

    return res.render('store/home', {
      title: req.__('ssr.home.title'),
      description: req.__('ssr.home.description'),
      products,
      ...categoryData(req)
    });

  } catch (err) {
    return next(err);
  }
}

async function catalog(req, res, next) {
  try {
    const {
      q = '',
      category = '',
      page = '1'
    } = req.query;

    const validCategories = productService
      .getCategories()
      .map(item => String(item.id));

    if (
      typeof q !== 'string' ||
      q.length > 150 ||
      typeof category !== 'string' ||
      (category && !validCategories.includes(category)) ||
      typeof page !== 'string' ||
      !/^[1-9]\d{0,5}$/.test(page)
    ) {
      return next(createError(400));
    }

    const search = q.trim();

    const result = await productService.listActive({
      q: search,
      category,
      page: Number(page),
      pageSize: 4
    });

    function pageLink(targetPage) {
      const params = new URLSearchParams();

      if (search) {
        params.set('q', search);
      }

      if (category) {
        params.set('category', category);
      }

      params.set('page', String(targetPage));
      params.set('lang', req.getLocale());

      return `/products?${params.toString()}`;
    }

    return res.render('store/catalog', {
      title: req.__('ssr.catalog.title'),
      description: req.__('ssr.catalog.description'),
      ...result,
      ...categoryData(req),
      q: search,
      category,
      pageLink
    });

  } catch (err) {
    return next(err);
  }
}

async function detail(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return next(createError(404));
    }

    const product = await productService.findActiveById(id);

    if (!product) {
      return next(createError(404));
    }

    const category = categoryData(req).categoryLabel(
      product.category_id
    );

    const title = `${product.name} | Stride & Co.`;

    const description = (
      product.description ||
      req.__('ssr.detail.descriptionFallback')
    ).slice(0, 160);

    return res.render('store/detail', {
      title,
      description,
      product,
      category,
      variants: product.variants || []
    });

  } catch (err) {
    return next(err);
  }
}

module.exports = {
  home,
  catalog,
  detail
};