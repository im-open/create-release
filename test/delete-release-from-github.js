module.exports = async (github, releaseId) => {
  await github.rest.repos.deleteRelease({
    owner: 'im-open',
    repo: 'create-release',
    release_id: releaseId
  });
};
