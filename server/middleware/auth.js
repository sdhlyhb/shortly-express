const models = require('../models');
const Promise = require('bluebird');

var sessionCreator = function() {
  return new Promise((resolve, reject) => {
    models.Sessions.create()
      .then(data => {
        return models.Sessions.get({id: data.insertId});
      })
      .then(session => {
        // console.log('this is the session:', session);
        // req.session = session;
        // res.cookie('shortlyid', session.hash);
        resolve(session);
      });
  });
};

module.exports.createSession = (req, res, next) => {
  //console.log(req);
  if (req.cookies && req.cookies.shortlyid) {
    models.Sessions.get({hash: req.cookies.shortlyid})
      .then(session => {
        if (session) {
          req.session = session;
          //console.log('*************REQ', req.session);
          next();
        } else {
          sessionCreator(req, res)
            .then((session) => {
              //console.log('*************REQ', req.session);
              req.session = session;
              res.cookie('shortlyid', session.hash);
              next();
            })
            .catch(err => {
              console.error(err);
            });
        }
      })
      .catch(() => {
        sessionCreator(req, res)
          .then((session) => {
            //console.log('*************REQ', req.session);
            req.session = session;
            res.cookie('shortlyid', session.hash);
            next();
          })
          .catch(err => {
            console.error(err);
          });
      });

  } else {
    sessionCreator()
      .then((session) => {
        //console.log('*************REQ', req.session);
        req.session = session;
        res.cookie('shortlyid', session.hash);
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

module.exports.verifySession = function(session) {
  return models.Sessions.isLoggedIn(session);
};

