import {assert} from 'chai';
import sinon from 'sinon';
import * as smaug from '../smaug.component';

describe('Test smaug component', () => {
  const ctx = {
    session: {
      state: {}
    },
    query: {
      token: null
    }
  };
  it('should export functions', () => {
    assert.isFunction(smaug.getAttributes);
  });

  it('should add client token', async() => {
    ctx.query.token = 'qwerty';
    await smaug.getAttributes(ctx, () => {});
    assert.deepEqual(ctx.session.state.client.id, 'abcde-12345');
  });

  it('should validate token', async() => {
    ctx.session.state = {};
    ctx.redirect = sinon.mock();
    ctx.query.token = 'invalid';
    ctx.query.returnUrl = 'some_url';
    await smaug.getAttributes(ctx, () => {});
    assert.isUndefined(ctx.session.state.client);
    assert.isTrue(ctx.redirect.called);
    assert.equal(ctx.redirect.args[0][0], 'some_url');
  });
});
