function home(req, res) {
  return res.render('index', {
    title: req.__('views.home.title'),
    description: req.__('views.home.description')
  });
}

function healthCheck(req, res){
    res.status(200).json({
        status : "UP"
    });
}

module.exports = { home, healthCheck };