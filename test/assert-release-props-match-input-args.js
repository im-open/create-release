module.exports = async (core, release, expectedReleaseValues) => {
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
    core.info(`\n\nAsserting that Release properties match the input args or defaults.`);

    // These expected items should match the action arguments
    for (const [key, value] of Object.entries(expectedReleaseValues)) {
      switch (key) {
        case 'releaseName':
          assertValuesMatch('Release Name', value, release.name);
          break;
        case 'tagName':
          assertValuesMatch('Tag Name', value, release.tag_name);
          break;
        case 'commitish':
          assertValuesMatch('Target Commitish', value, release.target_commitish);
          break;
        case 'draft':
          assertValuesMatch('Is Draft', value, release.draft);
          validatedDraft = true;
          break;
        case 'preRelease':
          assertValuesMatch('Is Pre-Release', value, release.prerelease);
          validatedPreRelease = true;
          break;
        case 'body':
          assertValuesMatch('Release Body', value, release.body);
          validatedBody = true;
          break;

        default:
          core.info(`\tAn unexpected release property has been submitted for validation: ${key}=${value}`);
      }
    }
  }

  validateProps();
};
