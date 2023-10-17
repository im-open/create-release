module.exports = async (github, core, releaseId) => {
  core.info(`\nAsserting that release ${releaseId} exists.`);
  const releaseResponse = await github.rest.repos.getRelease({
    owner: 'im-open',
    repo: 'create-release',
    release_id: releaseId
  });

  if (!releaseResponse && !releaseResponse.data) {
    core.setFailed(`\tRelease ${releaseId} does not appear to exist.`);
  } else {
    core.info(`\tRelease ${releaseId} exists.`);

    return releaseResponse.data;
  }
};
