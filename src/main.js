const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');
const fs = require('fs');

const requiredArgOptions = {
  required: true,
  trimWhitespace: true
};

const token = core.getInput('github-token', requiredArgOptions);
const tagInput = core.getInput('tag-name', requiredArgOptions);
const releaseNameInput = core.getInput('release-name') || tagInput;
const body = core.getInput('body');
const bodyPath = core.getInput('body-path');
const draft = core.getInput('draft') === 'true';
const prerelease = core.getInput('prerelease') === 'true';
const shouldDeleteExistingRelease = core.getInput('delete-existing-release') === 'true';

const assetPath = core.getInput('asset-path');
const assetName = core.getInput('asset-name');
const assetContentType = core.getInput('asset-content-type');

const tag = tagInput.replace('refs/tags/', '');
const releaseName = releaseNameInput.replace('refs/tags/', '');
const github = new GitHub(token);

console.log(`Current context.sha: ${context.sha}`);
console.log(`Current PR sha: ${context.payload.pull_request.head.sha}`);
console.log('context:');
console.log(context);
console.log('\n\n');
console.log('context pr head:');
console.log(context.payload.pull_request.head);
console.log('\n\n');

let commitish = core.getInput('commitish');
if (!commitish && context.eventName == 'pull_request') {
  core.info(`The commitish arg was empty for the pull_request, using PR's head sha: ${context.payload.pull_request.head.sha}`);
  commitish = context.payload.pull_request.head.sha;
} else if (!commitish) {
  core.info(`The commitish arg was empty, using context.sha: ${context.sha}`);
  commitish = context.sha;
} else {
  commitish = commitish.replace('refs/heads/', '').replace('refs/tags/', '');
  core.info(`The commitish arg was provided, using ${commitish}`);
}

let release_id;
let release_html_url;
let asset_upload_url;
let asset_browser_download_url;
let hasAssetToUpload = true;

function isEmpty(valueToTest) {
  return !valueToTest || valueToTest.trim().length === 0;
}

if (isEmpty(assetPath) && isEmpty(assetName) && isEmpty(assetContentType)) {
  hasAssetToUpload = false;
} else if (isEmpty(assetPath) || isEmpty(assetName) || isEmpty(assetContentType)) {
  core.setFailed(
    `One or more arguments required to upload an asset were not provided:\n\tasset-name:'${assetName}'\n\tasset-path:'${assetPath}'\n\tasset-content-type:'${assetContentType}'`
  );
  return;
}

async function deleteExistingRelease() {
  core.info('Checking if the release exists...');

  try {
    // Right now this throws an exception when the release does not exist
    // so it will be handled in the catch.  Adding the status check below
    // in case the implementation changes.
    const response = await github.repos.getReleaseByTag({
      owner: context.repo.owner,
      repo: context.repo.repo,
      tag: tag
    });

    if (response && response.status == 200) {
      core.info(`The release with tag ${tag} exists.`);
      core.info(`Deleting release with tag ${tag}...`);

      const releaseId = response.data.id;
      await github.repos.deleteRelease({
        owner: context.repo.owner,
        repo: context.repo.repo,
        release_id: releaseId
      });
      core.info(`Finished deleting release with tag ${tag}.`);
    } else {
      core.info(`The release with tag ${tag} does not appear to exist, the api returned status code ${response.status}.`);
    }
  } catch (error) {
    core.info(`The release with tag ${tag} does not appear to exist.`);
  }
}

async function createRelease() {
  try {
    // Grab the contents of the file
    let bodyFileContent = null;
    if (!isEmpty(bodyPath)) {
      try {
        core.info(`Getting contents of body file '${bodyPath}'...`);
        bodyFileContent = fs.readFileSync(bodyPath, {
          encoding: 'utf8'
        });
      } catch (error) {
        core.setFailed(`An error occurred getting the contents of the body file: ${error.message}`);
      }
    }

    // Create a release
    const createReleaseResponse = await github.repos.createRelease({
      owner: context.repo.owner,
      repo: context.repo.repo,
      tag_name: tag,
      name: releaseName,
      body: bodyFileContent || body,
      draft,
      prerelease,
      target_commitish: commitish
    });

    const {
      data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl }
    } = createReleaseResponse;

    release_id = releaseId;
    release_html_url = htmlUrl;
    asset_upload_url = uploadUrl;

    core.setOutput('release-id', releaseId);
    core.setOutput('release-html-url', htmlUrl);
    core.setOutput('asset-upload-url', uploadUrl);

    return uploadUrl;
  } catch (error) {
    core.setFailed(`An error occurred creating the release: ${error.message}`);
  }
}

async function uploadAsset(uploadUrl) {
  try {
    core.info(`Starting upload of ${assetName}...`);

    const contentLength = filePath => fs.statSync(filePath).size; // Calculates content-length for file passed in.  Used in header to upload asset.

    // Setup headers for API call https://octokit.github.io/rest.js/#octokit-routes-repos-upload-release-asset
    const headers = {
      'content-type': assetContentType,
      'content-length': contentLength(assetPath)
    };

    const uploadAssetResponse = await github.repos.uploadReleaseAsset({
      url: uploadUrl,
      headers,
      name: assetName,
      data: fs.readFileSync(assetPath)
    });

    // Get the browser_download_url for the uploaded release asset from the response
    const {
      data: { browser_download_url: browserDownloadUrl }
    } = uploadAssetResponse;

    // Set the output variable for use by other actions: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    asset_browser_download_url = browserDownloadUrl;
    core.setOutput('asset-browser-download-url', browserDownloadUrl);

    core.info(`Finished uploading ${assetName} to the release.`);
  } catch (error) {
    core.setFailed(`An error occurred uploading the asset: ${error.message}`);
  }
}

async function run() {
  if (shouldDeleteExistingRelease) {
    await deleteExistingRelease();
  }

  let uploadUrl = await createRelease();

  if (hasAssetToUpload) {
    await uploadAsset(uploadUrl);
  } else {
    core.info('There are no assets to upload.');
  }

  core.info('\nFinished Creating the Release:');
  core.info(`\tRelease ID: '${release_id}'`);
  core.info(`\tRelease HTML URL: '${release_html_url}'`);
  core.info(`\tAsset Upload URL: '${asset_upload_url}'`);
  core.info(`\tAsset Browser Download URL: '${asset_browser_download_url}'`);
}

run();
