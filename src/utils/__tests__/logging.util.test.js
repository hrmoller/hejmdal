import {log} from '../logging.util';

global.console = {
  log: jest.fn(),
  info: jest.fn(),
  error: jest.fn()
};

describe('Should remove sensitive info from log', () => {
  it('should replace pincode with ****', () => {
    const user = {agency: '710100', pincode: '1234'};

    log.error('Hide user pin', user);

    expect(JSON.parse(global.console.log.mock.calls[0][0]).msg).toBe(
      'Hide user pin'
    );
    expect(JSON.parse(global.console.log.mock.calls[0][0]).pincode).toBe(
      '****'
    );
  });

  it('Should only show 6 first numbers from CPR', () => {
    const user = {agency: '710100', userId: '1234567890'};

    log.error('Hide 4 last numbers in pin', user);

    expect(JSON.parse(global.console.log.mock.calls[0][0]).msg).toBe(
      'Hide 4 last numbers in pin'
    );
    expect(JSON.parse(global.console.log.mock.calls[0][0]).userId).toBe(
      '123456'
    );
  });

  it('Should hide pin and only show 6 first numbers from CPR', () => {
    const user = {agency: '710100', userId: '1234567890', pincode: '1234'};

    log.error('Hide 4 last numbers in pin', user);

    expect(JSON.parse(global.console.log.mock.calls[0][0]).msg).toBe(
      'Hide 4 last numbers in pin'
    );
    expect(JSON.parse(global.console.log.mock.calls[0][0]).pincode).toBe(
      '****'
    );
    expect(JSON.parse(global.console.log.mock.calls[0][0]).userId).toBe(
      '123456'
    );
  });

  it('Should deeply remove 4 last numbers from CPR', () => {
    log.error('Deeply hide 4 last numbers ($)', {
      borrowerCheckResponse: {
        userId: {
          $: '1234567890'
        },
        requestStatus: {
          $: 'borrower_not_found'
        }
      }
    });

    expect(JSON.parse(global.console.log.mock.calls[0][0]).msg).toBe(
      'Deeply hide 4 last numbers ($)'
    );
    expect(
      JSON.parse(global.console.log.mock.calls[0][0]).borrowerCheckResponse
        .userId.$
    ).toBe('123456');

    // requestStatus => $ value should stay unchanged:
    expect(
      JSON.parse(global.console.log.mock.calls[0][0]).borrowerCheckResponse
        .requestStatus.$
    ).toBe('borrower_not_found');
  });

  it('Should NOT hide 4 last numbers from (userId) at userLogin log-line (.debug)', () => {
    const user = {userId: '1234567890'};

    log.debug('Do NOT Hide the 4 last numbers in userId', user, false);

    expect(JSON.parse(global.console.log.mock.calls[0][0]).userId).toBe(
      '1234567890'
    );
  });
});
