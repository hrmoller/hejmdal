/**
 * @file
 * Add methods for handling the state object
 */

/**
 * Adds the get- and setState methods to the context object
 *
 * @param {object} ctx
 * @param {function} next
 */
export async function stateMiddleware(ctx, next) {
  Object.assign(ctx, {getState, setState, getUser, setUser, hasUser, resetIdentityProvider});
  await next();
}

/**
 * Sets the default values on the context
 *
 * @param ctx
 * @param next
 */
export async function setDefaultState(ctx, next) {
  ctx.session.state = {
    consents: {},   // contains consent attributes for services [serviceName] = Array(attributes)
    returnUrl: ctx.query.returnurl === 'null' ? null : ctx.query.returnurl || null,
    serviceAgency: ctx.query.agency === 'null' ? null : ctx.query.agency || null,
    serviceClient: {},  // supplied by smaug, contains serviceId, (serviceName), Array(attributes) Array(identityProviders)
    smaugToken: ctx.query.token === 'null' ? null : ctx.query.token || null,
    ticket: ctx.ticket || {} // ticketId (id) and ticketToken (token) and/or attributes object
  };

  ctx.session.user = ctx.session.user || {};  // contains the userId, userIdType, identityProviders

  await next();
}

/**
 * Set new values on State object
 *
 * @param newValues
 * @returns {Object}
 */
function setState(newValues) {
  this.session.state = Object.assign({}, this.session.state || {}, newValues);
  return this.session.state;
}

/**
 * Get the State object
 *
 * @returns {Object}
 */
function getState() {
  return this.session.state;
}

/**
 * Set new values on User object
 *
 * @param newValues
 * @returns {Object}
 */
function setUser(newValues) {
  const existingIps = this.session.user && this.session.user.identityProviders || [];
  const identityProviders = !existingIps.includes(newValues.userType) && existingIps.concat([newValues.userType]) || existingIps;
  this.session.user = Object.assign({}, this.session.user || {}, newValues, {identityProviders});
  return this.session.user;
}

/**
 * Get the User object
 *
 * @returns {Object}
 */
function getUser() {
  return this.session.user;
}

/**
 * Check if user is set on session
 *
 * @returns {boolean}
 */
function hasUser() {
  return this.session.user.userId && true || false;
}

function resetIdentityProvider(idp) {
  const user = this.getUser();
  user.identityProviders = user.identityProviders.filter(identityProvider => identityProvider !== idp);
}
