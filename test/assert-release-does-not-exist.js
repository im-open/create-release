module.exports = async (github, core, releaseId) => {
  core.info(`\nAsserting that release ${releaseId} does not exist.`);
  await github.rest.repos
    .getRelease({
      owner: 'im-open',
      repo: 'create-release',
      release_id: releaseId
    })
    .then(() => {
      core.setFailed(`\tRelease ${releaseId} exists which it should not.`);
    })
    .catch(e => {
      console.log(e);
      core.info(`\tRelease ${releaseId} does not appear to exist which is expected.`);
    });
};
