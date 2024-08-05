module.exports = async (core, fullBodyValue, startingFragment, endingFragment) => {
  core.info('\nAsserting auto-generated notes include expected content.');

  core.info(`\n\tBody should start with: '${startingFragment}'`);
  core.info(`\n\tBody should end with: '${endingFragment}'`);
  core.info(`\n\tFull Body value: '${fullBodyValue}'`);

  if (fullBodyValue.startsWith(startingFragment)) {
    core.info(`\tThe body starts with the expected fragment.`);
  } else {
    core.setFailed(`\tThe Body does not start with the expected fragment.`);
  }
  if (fullBodyValue.endsWith(endingFragment)) {
    core.info(`\tThe body ends with the expected fragment.`);
  } else {
    core.setFailed(`\tThe body does not end with the expected fragment.`);
  }
};
