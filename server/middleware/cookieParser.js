const parseCookies = (req, res, next) => {
  console.log(req);
  var cookieObj = {};
  if (req.headers.cookie) {
    var cookies = req.headers.cookie.split('; ');
    cookies.forEach(cookie => {
      var [key, val] = cookie.split('=');
      cookieObj[key] = val;
    });
  }
  req.cookies = cookieObj;
  //console.log(cookieObj);
  next();
};

module.exports = parseCookies;