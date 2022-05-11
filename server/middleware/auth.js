const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  //console.log(req);
  if (req.cookies && req.cookies.shortlyid) {
    models.Sessions.get({hash: req.cookies.shortlyid})
      .then(session => {
        req.session = session;
        next();
      })
      .catch(() => {
        // eslint-disable-next-line no-use-before-define
        createSession(req, res)
          .then(() => {
            next();
          })
          .catch(err => {
            console.error(err);
          });
      });

  } else {
    // eslint-disable-next-line no-use-before-define
    createSession(req, res)
      .then(() => {
        next();
      })
      .catch(err => {
        console.error(err);
      });
  }
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

var createSession = function(req, res) {
  return models.Sessions.create()
    .then(data => {
      return models.Sessions.get({id: data.insertId});
    })
    .then(session => {
      console.log(session);
      req.session = session;
      res.cookie('shortlyid', session.hash);
    });
};

