module.exports = async (github, core, releaseId) => {
  core.info(`\nDelete was called for Release '${releaseId}'.`);

  if (releaseId && releaseId.length > 0) {
    await github.rest.repos
      .deleteRelease({
        owner: 'im-open',
        repo: 'create-release',
        release_id: releaseId
      })
      .then(() => {
        core.info(`\tRelease '${releaseId}' was successfully deleted.`);
      })
      .catch(() => {
        // errors can happen if the release doesn't exist.  We can ignore those.
        core.info(`\tRelease '${releaseId}' does not appear to exist - do nothing.`);
      });
  } else {
    core.info(`\tReleaseId was not provided - do nothing.`);
  }
};
