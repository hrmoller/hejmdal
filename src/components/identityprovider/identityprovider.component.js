import compose from 'koa-compose';
import {log} from '../../utils/logging.util';
import {createHash, validateHash} from '../../utils/hash.utils';
import {VERSION_PREFIX} from '../../utils/version.util';
import index from './templates/index.template';
import borchk from './templates/borchk.template';
import nemlogin from './templates/nemlogin.template';
import unilogin from './templates/unilogin.template';

const templates = {index, borchk, nemlogin, unilogin};

/**
 * Initializes state object.  TODO: in its own component???
 *
 * @param ctx
 * @param next
 * @returns {*}
 */
export function initialize(ctx, next) {
  // this is a hardcoded state object for testing
  ctx.session.state = Object.assign({
    user: null,
    attributes: {
      providers: ['borchk', 'unilogin']
    },
    token: 'qwerty',
    ticket: null,
    service: 'testservice',
    consents: {}
  }, ctx.session.state || {});

  return next();
}

/**
 * Returns Identityprovider screen if user is not logged in.  TODO: in its own component???
 *
 * @param ctx
 * @param next
 * @returns {*}
 */
export function authenticate(ctx, next) {
  try {
    if (!ctx.session.state.user) {
      const authToken = createHash(ctx.session.state.token);
      const content = ctx.session.state.attributes.providers.map(value => templates[value](VERSION_PREFIX, authToken)).join('');
      ctx.body = index({title: 'Log ind via ...', content});
      ctx.status = 200;
    }
  }
  catch (e) {
    log.error(e);
    ctx.status = 404;
  }

  return next();
}

/**
 * Parses the callback parameters for unilogin.
 *
 * @param ctx
 * @param next
 * @returns {*}
 */
export function uniloginCallback(ctx, next) {
  if (ctx.params.type !== 'unilogin') {
    return next();
  }

  ctx.session.state.user = {
    cpr: ctx.query.id,
    type: 'unilogin',
    unilogin: 'uniloginId'
  };
}

/**
 * Parses the callback parameters for borchk.
 *
 * @param ctx
 * @param next
 * @returns {*}
 */
export function borchkCallback(ctx, next) {
  if (ctx.params.type !== 'borchk') {
    return next();
  }
  ctx.session.state.user = {
    cpr: ctx.query.id,
    type: 'borchk',
    libraryId: 'libraryId',
    pincode: 'pincode'
  };
}

/**
 * Parses the callback parameters for nemlogin.
 *
 * @param ctx
 * @param next
 * @returns {*}
 */
export function nemloginCallback(ctx, next) {
  if (ctx.params.type !== 'nemlogin') {
    return next();
  }
  ctx.session.state.user = {
    cpr: ctx.query.id,
    type: 'nemlogin'
  };
}

/**
 * Callback function from external identityproviders
 *
 * @param ctx
 * @param next
 */
export function identityProviderCallback(ctx, next) {
  try {
    if (!validateHash(ctx.params.token, ctx.session.state.token)) {
      ctx.status = 403;
      return next();
    }

    compose([borchkCallback, uniloginCallback, nemloginCallback])(ctx, next);
  }
  catch (e) {
    log.error(e);
    ctx.status = 500;
  }

  next();
}
