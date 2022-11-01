const core = require('@actions/core');
const github = require('@actions/github');
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
const draft = core.getBooleanInput('draft');
const prerelease = core.getBooleanInput('prerelease');
const shouldDeleteExistingRelease = core.getBooleanInput('delete-existing-release');
const commitish = core.getInput('commitish', requiredArgOptions);

const assetPath = core.getInput('asset-path');
const assetName = core.getInput('asset-name');
const assetContentType = core.getInput('asset-content-type');

const orgName = github.context.repo.owner;
const repoName = github.context.repo.repo;

const tag = tagInput.replace('refs/tags/', '');
const releaseName = releaseNameInput.replace('refs/tags/', '');
const octokit = github.getOctokit(token);

let release_id;
let release_html_url;
let asset_upload_url;
let asset_browser_download_url;
let hasAssetToUpload = true;

function isEmpty(valueToTest) {
  return !valueToTest || valueToTest.trim().length === 0;
}

async function deleteExistingRelease() {
  // Right now this throws an exception when the release does not exist
  // so it will be handled in the catch.
  let releaseId;

  core.info('Checking if the release exists...');
  await octokit.rest.repos
    .getReleaseByTag({
      owner: orgName,
      repo: repoName,
      tag: tag
    })
    .then(response => {
      core.info(`The release with tag ${tag} exists.`);
      releaseId = response.data.id;
    })
    .catch(() => {
      releaseId = null;
      core.info(`The release with tag ${tag} does not appear to exist.  Nothing will be deleted.`);
    });

  if (releaseId) {
    core.info(`Try to delete release with tag ${tag}...`);
    await octokit.rest.repos
      .deleteRelease({
        owner: orgName,
        repo: repoName,
        release_id: releaseId
      })
      .then(() => {
        core.info(`Finished deleting release with tag ${tag}.`);
      })
      .catch(error => {
        core.setFailed(`An error occurred deleting the existing release: ${error.message}`);
      });
  }
}

async function createRelease() {
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
  await octokit.rest.repos
    .createRelease({
      owner: orgName,
      repo: repoName,
      tag_name: tag,
      name: releaseName,
      body: bodyFileContent || body,
      draft,
      prerelease,
      target_commitish: commitish
    })
    .then(createReleaseResponse => {
      release_id = createReleaseResponse.data.id;
      release_html_url = createReleaseResponse.data.html_url;
      asset_upload_url = createReleaseResponse.data.upload_url;

      core.setOutput('release-id', release_id);
      core.setOutput('release-html-url', release_html_url);
      core.setOutput('asset-upload-url', asset_upload_url);
    })
    .catch(error => {
      core.setFailed(`An error occurred creating the release: ${error.message}`);
    });

  return asset_upload_url;
}

async function uploadAsset(uploadUrl) {
  core.info(`Starting upload of ${assetName}...`);

  const contentLength = filePath => fs.statSync(filePath).size; // Calculates content-length for file passed in.  Used in header to upload asset.

  // Setup headers for API call https://octokit.github.io/rest.js/#octokit-routes-repos-upload-release-asset
  const headers = {
    'content-type': assetContentType,
    'content-length': contentLength(assetPath)
  };

  await octokit.rest.repos
    .uploadReleaseAsset({
      url: uploadUrl,
      headers,
      name: assetName,
      data: fs.readFileSync(assetPath)
    })
    .then(uploadAssetResponse => {
      // Get the browser_download_url for the uploaded release asset from the response
      // Set the output variable for use by other actions: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
      asset_browser_download_url = uploadAssetResponse.data.browser_download_url;
      core.setOutput('asset-browser-download-url', asset_browser_download_url);

      core.info(`Finished uploading ${assetName} to the release.`);
    })
    .catch(error => {
      core.setFailed(`An error occurred uploading the asset: ${error.message}`);
    });
}

async function run() {
  core.info(`Creating release in ${orgName}\${repoName}`);
  if (isEmpty(assetPath) && isEmpty(assetName) && isEmpty(assetContentType)) {
    hasAssetToUpload = false;
  } else if (isEmpty(assetPath) || isEmpty(assetName) || isEmpty(assetContentType)) {
    core.setFailed(
      `One or more arguments required to upload an asset were not provided:\n\tasset-name:'${assetName}'\n\tasset-path:'${assetPath}'\n\tasset-content-type:'${assetContentType}'`
    );
    return;
  }

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
