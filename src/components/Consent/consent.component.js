/**
 * @file
 * Consent component handling the nessecary consent
 */

import {form} from 'co-body';
import {VERSION_PREFIX} from '../../utils/version.util';
import {CONFIG} from '../../utils/config.util';
import KeyValueStorage from '../../models/keyvalue.storage.model';
import MemoryStorage from '../../models/memory.storage.model';
import PersistentConsentStorage from '../../models/Consent/consent.persistent.storage.model';
import {log} from '../../utils/logging.util';
import {getText} from '../../utils/text.util';

const consentStore = CONFIG.mock_storage ?
  new KeyValueStorage(new MemoryStorage()) :
  new KeyValueStorage(new PersistentConsentStorage());

/**
 * Renders the consent UI
 *
 * @param {object} ctx
 * @param {function} next
 */
export async function giveConsentUI(ctx, next) {
  const state = ctx.getState();
  if (!state || !state.serviceClient || !state.serviceClient.id) {
    ctx.redirect(`${VERSION_PREFIX}/fejl`);
  }
  else {
    const returnUrl = state.returnUrl ? state.serviceClient.urls.host + state.returnUrl : '';
    const helpText = getText(['consent'], {__SERVICE_CLIENT_NAME__: state.serviceClient.name});
    ctx.render('Consent', {
      attributes: getConsentAttributes(ctx),
      consentAction: VERSION_PREFIX + '/login/consentsubmit/' + state.smaugToken,
      consentFailed: false,
      returnUrl: returnUrl,
      serviceName: state.serviceClient.name,
      help: helpText
    });
    await next();
  }
}

/**
 * Submit handler for consent submission. If consent is rejected the session is cleared.
 * If consent is given, it is saved and the flow continues.
 *
 * @param {object} ctx
 * @param {function} next
 */
export async function consentSubmit(ctx, next) {
  const response = await getConsentResponse(ctx);

  if (!response || !response.userconsent || (response.userconsent && response.userconsent === '0')) {
    const serviceClient = ctx.getState().serviceClient;
    const returnUrl = serviceClient.urls.host + serviceClient.urls.error + '?message=consent%20was%20rejected`';
    const helpText = getText(['consentReject'], {__SERVICE_CLIENT_NAME__: serviceClient.name});

    // Remove current identityProvider from list of used providers
    ctx.resetIdentityProvider(ctx.getUser().userType);

    ctx.render('Consent', {
      consentFailed: true,
      returnUrl: returnUrl,
      serviceName: serviceClient.name,
      help: helpText
    });
  }
  else {
    await storeUserConsent(ctx);
  }
  await next();
}

/**
 * Retrieving consent response through co-body module
 *
 * @param ctx
 * @return {{}}
 */
async function getConsentResponse(ctx) {
  let response = null;
  try {
    response = await form(ctx);
  }
  catch (e) {
    log.error('Could not retrieve consent response', {error: e.message, stack: e.stack});
  }

  return response;
}

/**
 * Requests a check for existing user consent and continues the flow if it's found.
 * If no consent is found the user is redirected to the page where the consent can be made.
 *
 * @param {object} ctx
 * @param {function} next
 */
export async function retrieveUserConsent(ctx, next) {
  const userShouldGiveConsent = await shouldUserGiveConsent(ctx);
  if (userShouldGiveConsent) {
    ctx.redirect(`${VERSION_PREFIX}/login/consent`);
  }
  else {
    await next();
  }
}

/**
 * Check if a user should give consent.
 *
 * A user should give consent if there are attributes in the ticket the service client requests, that the user have not
 * given consent to before.
 *
 * @param ctx
 * @returns {boolean}
 */
export async function shouldUserGiveConsent(ctx) {
  const consent = await getConsent(ctx);
  const attributes = getConsentAttributes(ctx);
  return Object.keys(attributes).filter(attribute => !consent.includes(attribute)).length > 0;
}

/**
 * Stores the given consent in the storage.
 * Exported only to make testable.
 *
 * @param {object} ctx
 * @return {*}
 */
export async function storeUserConsent(ctx) {
  const consent = getConsentAttributes(ctx);
  const user = ctx.getUser();
  const state = ctx.getState();

  if (!user.userId) {
    log.error('Can not store consent without a userId');
    return false;
  }

  if (!state.serviceClient.id) {
    log.error('Can not store consent without a serviceClient ID');
    return false;
  }

  const consentid = `${user.userId}:${state.serviceClient.id}`;
  addConsentToState(ctx, consent);

  await consentStore.delete(consentid);

  try {
    await consentStore.insert(consentid, {keys: Object.keys(consent)});
  }
  catch (e) {
    log.error('Failed saving of user consent', {error: e.message, stack: e.stack});
  }
}

/**
 * Adds a consent object to the state object
 *
 * @param ctx
 * @param consent
 */
function addConsentToState(ctx, consent) {
  const state = ctx.getState();
  const consents = Object.assign({}, state.consents, {[state.serviceClient.id]: consent});
  ctx.setState({consents});
}

/**
 *
 * @param ctx
 * @returns {boolean}
 */
export async function getConsent(ctx) {
  const userId = ctx.getUser().userId;
  const serviceClientId = ctx.getState().serviceClient.id;
  let consent = [];
  try {
    const consentObject = (await consentStore.read(`${userId}:${serviceClientId}`));
    consent = consentObject && consentObject.keys || [];
  }
  catch (e) {
    log.error('Error while retrieving user consent', {error: e.message, stack: e.stack});
  }

  return consent;
}

/**
 *
 * @param definitionAttributes
 * @param ticketAttributes
 * @returns {{}}
 */
function getConsentAttributes(ctx) {
  const state = ctx.getState();
  const definitionAttributes = state.serviceClient.attributes || {};
  const ticketAttributes = state.ticket.attributes || {};
  const consentAttributes = {};
  Object.keys(definitionAttributes).forEach((key) => {
    if (attributeIsSet(ticketAttributes[key])) {
      consentAttributes[key] = Object.assign({}, definitionAttributes[key]);
      consentAttributes[key].key = key;
    }
  });
  return consentAttributes;
}

/**
 * Check if an attribute contains values.
 *
 * @param attribute
 * @returns {boolean}
 */
function attributeIsSet(attribute) {
  let isSet = true;
  if (attribute === null || typeof attribute === 'undefined') {
    isSet = false;
  }
  else if (Array.isArray(attribute) && attribute.length === 0) {
    isSet = false;
  }
  else if (typeof attribute === 'object' && Object.keys(attribute).length === 0) {
    isSet = false;
  }

  return isSet;
}
