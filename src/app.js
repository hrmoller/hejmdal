/**
 * @file
 * Configure and start oAuth2 hejmdal server
 */

import bodyParser from 'body-parser';
import express from 'express';
import path from 'path';
import session from 'express-session';
const KnexSessionStore = require('connect-session-knex')(session);

import model from './oAuth2/oAuth2.model';
import OAuthServer from 'express-oauth-server';
import initPassport from './oAuth2/passport';
import Knex from 'knex';
import {Model} from 'objection';

// Utils
import {CONFIG} from './utils/config.util';

// Initialize knex.
const knex = Knex(CONFIG.postgres);
// Bind all Models to a knex instance. If you only have one database in
// your server this is all you have to do. For multi database systems, see
// the Model.bindKnex method.
Model.knex(knex);

const sessionStore = new KnexSessionStore({knex});

import {stateMiddleware} from './middlewares/state.middleware';
import loginRoutes from './routes/login.routes';
import logoutRoutes from './routes/logout.routes';
import consentRoutes from './routes/consent.routes';
import rootRoutes from './routes/root.routes';
import oAuthRoutes from './routes/oauth.routes';
import userinfoRoutes from './routes/userinfo.routes';
import profileRoutes from './routes/profile.routes';

const host = process.env.HOST;

const app = express();
initPassport(app);
app.oauth = new OAuthServer({
  model, // See https://github.com/oauthjs/node-oauth2-server for specification
  allowBearerTokensInQueryString: true,
  grants: ['password', 'authorization_code'],
  debug: true,
  allowEmptyState: true,
  continueMiddleware: false
});

app.model = model;

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '/Templates'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(
  session({
    secret: CONFIG.session.secret,
    maxAge: CONFIG.session.life_time,
    saveUninitialized: true,
    secure: CONFIG.app.env === 'production',
    resave: true,
    store: !CONFIG.mock_storage && sessionStore
  }
  )
);

app.use(stateMiddleware);

app.use(express.static('static'));

app.use('/', rootRoutes);
app.use('/login', loginRoutes);
app.use('/logout', logoutRoutes);
app.use('/oauth', oAuthRoutes);
app.use('/consent', consentRoutes);
app.use('/userinfo', userinfoRoutes);
app.use('/profile', profileRoutes);

/**
 * Test callback endpoint
 */
app.get('/callback', (req, res) => {
  // Outputs curl commando for requesting access_token
  res.send(
    `
    <html><body>
    <h3>Lav følgende POST kald for at hente en token:</h3>
    <code>curl -X POST ${host}/oauth/token -d 'grant_type=authorization_code&code=${
      req.query.code
    }&client_id=${req.session.query.client_id}&client_secret=hejmdal_secret&redirect_uri=${host}/callback'</code>
    
    <h3>Lav derefter et kald til /userinfo med returnerede access_token, for at hente brugerinformation:</h3>

    <code>curl -X POST ${host}/userinfo -d 'access_token={ACCESS_TOKEN}'</code>
    </body></html>
    `
  );
});

app.listen(process.env.PORT || 3000);
