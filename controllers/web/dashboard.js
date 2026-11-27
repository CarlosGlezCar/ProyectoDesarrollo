const dashboardService = require(
  '../../services/dashboard.service'
);

async function showDashboard(req, res, next) {
  try {
    const data = await dashboardService.getDashboard();

    return res.render('admin/dashboard', {
      title: req.__('ssr.admin.dashboard'),
      description: req.__('ssr.dashboard.description'),
      stats: data.stats,
      recentOrders: data.recentOrders
    });

  } catch (err) {
    return next(err);
  }
}

module.exports = {
  showDashboard
};