module.exports = async (github, core, releaseId) => {
  const releaseResponse = await github.rest.repos.getRelease({
    owner: 'im-open',
    repo: 'create-release',
    release_id: releaseId
  });

  if (!releaseResponse && !releaseResponse.data) {
    // These expected items should match the action arguments
    core.exportVariable('ACTUAL_RELEASE_NAME', '');
    core.exportVariable('ACTUAL_TAG_NAME', '');
    core.exportVariable('ACTUAL_TARGET_COMMITISH', '');
    core.exportVariable('ACTUAL_DRAFT', '');
    core.exportVariable('ACTUAL_PRE_RELEASE', '');
    core.exportVariable('ACTUAL_BODY', '');

    // These expected items should match the action outputs
    core.exportVariable('ACTUAL_UPLOAD_URL', '');
    core.exportVariable('ACTUAL_DOWNLOAD_URL', '');
    core.exportVariable('ACTUAL_HTML_URL', '');

    core.setFailed(`Release ${releaseId} was not found.`);
  } else {
    const release = releaseResponse.data;
    // These expected items should match the action arguments
    core.exportVariable('ACTUAL_RELEASE_NAME', release.name);
    core.exportVariable('ACTUAL_TAG_NAME', release.tag_name);
    core.exportVariable('ACTUAL_TARGET_COMMITISH', release.target_commitish);
    core.exportVariable('ACTUAL_DRAFT', release.draft);
    core.exportVariable('ACTUAL_PRE_RELEASE', release.prerelease);
    core.exportVariable('ACTUAL_BODY', release.body);

    // These expected items should match the action outputs
    core.exportVariable('ACTUAL_UPLOAD_URL', release.upload_url);
    core.exportVariable('ACTUAL_DOWNLOAD_URL', release.assets_url);
    core.exportVariable('ACTUAL_HTML_URL', release.html_url);

    core.info(`Release ${releaseId} was found, setting environment variables.`);
    console.log('release:');
    console.log(release);
  }
};
