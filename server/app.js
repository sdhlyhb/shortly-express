const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const Auth = require('./middleware/auth');
const models = require('./models');
const morgan = require('morgan');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(morgan('tiny'));
app.use(partials());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));



app.get('/',
  (req, res) => {
    res.render('index');
  });

app.get('/create',
  (req, res) => {
    res.render('index');
  });

app.get('/links',
  (req, res, next) => {
    models.Links.getAll()
      .then(links => {
        res.status(200).send(links);
      })
      .error(error => {
        res.status(500).send(error);
      });
  });

app.post('/links',
  (req, res, next) => {
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
          baseUrl: req.headers.origin
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
  });

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/signup', (req, res) => {
  res.render('signup');
});
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/signup', (req, res, next) =>{
  // var username = req.body.username;
  models.Users.get({username: req.body.username})
    .then(user => {
      if (user) {
        console.log('Username exists!!', user);
        res.redirect('/signup');
      } else {
        console.log('User created!!', user);
        models.Users.create(req.body)
          .then(data => {
            res.redirect('/');
          })
          .catch(err => {
            console.error(err);
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
          res.redirect('/');
        } else {
          console.log('wrong password');
          res.redirect('/login');
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
