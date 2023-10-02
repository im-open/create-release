module.exports = async (core, release, hasAssets, expectedActionValues) => {
  function assertValuesMatch(variableName, expectedValue, actualValue) {
    core.info(`\n\tExpected ${variableName}: '${expectedValue}'`);
    core.info(`\tActual ${variableName}:   '${actualValue}'`);

    if (expectedValue != actualValue) {
      core.setFailed(`\tThe expected ${variableName} does not match the actual ${variableName}.`);
    } else {
      core.info(`\tThe expected and actual ${variableName} values match.`);
    }
  }

  function validateProps() {
    core.info(`\n\nAsserting that Release properties match the Action's outputs.`);

    const expectedReleaseHtmlUrl = expectedActionValues['release-html-url'];
    const actualReleaseHtmlUrl = release.html_url;
    assertValuesMatch('Release Html Url', expectedReleaseHtmlUrl, actualReleaseHtmlUrl);

    const expectedAssetUploadUrl = expectedActionValues['asset-upload-url'];
    const actualAssetUploadUrl = release.upload_url;
    assertValuesMatch('Release Upload Url', expectedAssetUploadUrl, actualAssetUploadUrl);

    const expectedAssetCount = hasAssets ? 1 : 0;
    const actualAssetCount = release.assets.length;
    assertValuesMatch('Asset Count', expectedAssetCount, actualAssetCount);

    const expectedDownloadUrl = expectedActionValues['asset-browser-download-url'] || '';
    const actualDownloadUrl = hasAssets ? release.assets[0].browser_download_url : '';
    assertValuesMatch('Download Url', expectedDownloadUrl, actualDownloadUrl);
  }

  validateProps();
};
