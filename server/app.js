const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const Auth = require('./middleware/auth');
const cookieParser = require('./middleware/cookieParser');
const models = require('./models');
const morgan = require('morgan');
const request = require('request');
//let alert = require('alert'); //this won't work on the browser but only on the local computer.

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(morgan('tiny'));
app.use(cookieParser);
app.use(Auth.createSession);
app.use(partials());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));



app.get('/',
  (req, res) => {
    if (Auth.verifySession(req.session)) {
      res.render('index');
    } else {
      res.redirect('/login');
    }

  });

app.get('/create',
  (req, res) => {
    if (Auth.verifySession(req.session)) {
      res.render('index');
    } else {
      res.redirect('/login');
    }
  });

app.get('/links',
  (req, res, next) => {
    if (Auth.verifySession(req.session)) {
      models.Links.getAll({ userid: req.session.userId})
        .then(links => {
          console.log('LINKS', links);
          res.status(200).send(links);
        })
        .error(error => {
          res.status(500).send(error);
        });
    } else {
      res.redirect('/login');
    }
  });


app.post('/links',
  (req, res, next) => {
    //console.log('this is req.session:', req.session);
    var url = req.body.url;
    if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
      return res.sendStatus(404);
    }

    return models.Links.get({ url })
      .then(link => {
        if (link) {
          throw link;
        }
        return models.Links.getUrlTitle(url);
      })
      .then(title => {
        return models.Links.create({
          url: url,
          title: title,
          baseUrl: req.headers.origin,
          userid: req.session.userId
        });
      })
      .then(results => {
        return models.Links.get({ id: results.insertId });
      })
      .then(link => {
        throw link;
      })
      .error(error => {
        res.status(500).send(error);
      })
      .catch(link => {
        res.status(200).send(link);
      });
    res.redirect('/login');
  });

app.get('/logout', (req, res) => {
  //console.log('this is req for logout', req);
  models.Sessions.delete({hash: req.session.hash})
    .then( data => {
      res.cookie('shortlyid', '');
      res.redirect('/login');

    })
    .catch(err => {
      console.error(err);
    });

});


/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/signup', (req, res) => {
  var temp = req.url.split('?');
  if (temp[1] === 'error=Username_Taken') {
    console.log('SIGNUP2');
    res.render('signup2');
  } else {
    res.render('signup');
  }
});

app.get('/login', (req, res) => {
  var temp = req.url.split('?');
  if (temp[1] === 'error=WRONG_PASSWORD') {
    console.log('LOGIN2');
    res.render('login2');
  } else {
    res.render('login');
  }

});

app.post('/signup', (req, res, next) =>{
  // var username = req.body.username;
  models.Users.get({username: req.body.username})
    .then(user => {
      if (user) {
        //alert('Username exists!!!');
        console.log('Username exists!!', user);
        res.redirect('/signup?error=' + encodeURIComponent('Username_Taken'));
        //res.redirect('/signup');
      } else {
        console.log('User created!!', user);

        models.Users.create(req.body)
          .then(data => {
            models.Sessions.update({hash: req.session.hash}, { userId: data.insertId})
              .then(() => { res.redirect('/'); });

          })
          .catch(err => {
            console.error(err);
            res.redirect('/signup');
          });
      }
    });
});

app.post('/login', (req, res, next) => {
  console.log('this is login req.body', req.body);
  models.Users.get({username: req.body.username})
    .then(user => {
      console.log(user);
      if (!user) {
        console.log('this user is not signed up yet!');
        res.redirect('/login');
      } else {
        if (models.Users.compare(req.body.password, user.password, user.salt)) {
          console.log('successfully logged in');
          models.Sessions.update({hash: req.session.hash}, { userId: user.id})
            .then(() => {
              res.redirect('/');
            })
            .catch(err => { console.log(err); });
        } else {
          res.redirect('/login?error=' + encodeURIComponent('WRONG_PASSWORD'));
          console.log('wrong password');
          //res.redirect('/login');
        }
      }
    });
});




/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
