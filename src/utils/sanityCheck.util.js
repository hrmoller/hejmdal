/**
 * @file
 * Perform sanityCheck of external resources
 */

import Session from '../models/db_models/session.model';
import * as Borchk from './components/Borchk/borchk.client';
import {log} from './logging.util';

export default function sanityCheck() {
  checkDatabase();
  checkBorchk();
}

/**
 * Check if database is available
 */
export function checkDatabase() {
  Session.query().count('*')
    .catch((e) => {
      log.error('Query failed', {error: e.message, stack: e.stack});
    });
}

/**
 * Check if Borchk webservice is responding
 */
export function checkBorchk() {
  Borchk.getClient('check', 'check', 'check', 'check').then(res => {
    if (!res.borrowerCheckResponse) {
      throw Error('No valid response from borchk');
    }
  }).catch(e => {
    log.error('Borchk is failing', {error: e.message, stack: e.stack});
  });

}

