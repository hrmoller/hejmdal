/**
 * Template for unilogin link.
 *
 */

export default (version, token) => `
<a href="${version}/login/identityProviderCallback/unilogin/${token}?id=nemtestuser">UNI-login</a>
`;
