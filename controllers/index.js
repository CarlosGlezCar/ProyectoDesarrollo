function home(req, res) {
    res.render('index', {
        title: req.__('views.home.title'),
        welcome: req.__('views.home.welcome'),
        locale: req.getLocale()
    });
}

function healthCheck(req, res) {
    res.status(200).json({
        status: 'UP',
        locale: req.getLocale()
    });
}

module.exports = { home, healthCheck };