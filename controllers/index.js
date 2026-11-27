function home(req, res) {
  return res.render('index', {
    title: req.__('ssr.home.title'),
    description: req.__('ssr.home.description')
  });
}

function healthCheck(req, res) {
  return res.status(200).json({
    status: 'UP'
  });
}

module.exports = {
  home,
  healthCheck
};