/* eslint-disable */

module.exports = async function () {
  console.log((globalThis as Record<string, unknown>)['__TEARDOWN_MESSAGE__']);
};
