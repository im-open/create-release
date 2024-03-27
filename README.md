# create-release

This action can be used to create a GitHub Release and optionally upload an asset to the release.  This action is based on two GitHub actions [create-release] and [upload-release-asset] which have been deprecated.

This action has the option of uploading a single asset to the release.  If more than one artifact is needed or if the artifact is not available when the release is created the [im-open/upload-release-asset] action can be used.

This action also has the option of deleting the release if it already exists.  If a workflow tries to create a release that already exists it will fail which may happen when a workflow is re-run.  This functionality is also provided in the [im-open/delete-release-by-tag] action if a release needs to be deleted before the release is created.

## Index <!-- omit in toc -->

- [create-release](#create-release)
  - [Inputs](#inputs)
  - [Outputs](#outputs)
  - [Usage Examples](#usage-examples)
  - [Contributing](#contributing)
    - [Incrementing the Version](#incrementing-the-version)
    - [Source Code Changes](#source-code-changes)
    - [Recompiling Manually](#recompiling-manually)
    - [Updating the README.md](#updating-the-readmemd)
    - [Tests](#tests)
  - [Code of Conduct](#code-of-conduct)
  - [License](#license)

## Inputs

| Parameter                 | Is Required                      | Description                                                                                                                                                                                  |
|---------------------------|----------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `github-token`            | true                             | A token with permission to create and delete releases.  Generally secrets.GITHUB_TOKEN.                                                                                                      |
| `tag-name`                | true                             | The name of the tag.                                                                                                                                                                         |
| `release-name`            | false                            | The name of the release. Defaults to the tag name if not provided.                                                                                                                           |
| `commitish`               | true                             | Specifies the commitish value that identifies the commit to tag. Can be any branch or commit SHA.                                                                                            |
| `body`                    | false                            | Text describing the contents of the release.                                                                                                                                                 |
| `body-path`               | false                            | Path to file with information about the release.                                                                                                                                             |
| `draft`                   | false                            | Flag indicating whether to create a draft (unpublished) release or a published one.<br/>Accepted Values: `true\|false`.  Default: `false`.                                                   |
| `prerelease`              | false                            | Flag indicating whether this release is a pre-release or a full release.<br/>Accepted Values: `true\|false`.  Default: `false`.                                                              |
| `delete-existing-release` | false                            | Flag indicating whether to delete then re-create a release if it already exists.<br/>Accepted Values: `true\|false`.  Default: `false`.                                                      |
| `generate-release-notes`  | false                            | Flag indicating whether to [auto-generate release notes](https://octokit.github.io/rest.js/v19#repos-create-release) for the release.<br/>Accepted Values: `true\|false`.  Default: `false`. |
| `asset-path`              | Required when uploading an asset | The path to the asset you want to upload.  Required when uploading an asset.                                                                                                                 |
| `asset-name`              | Required when uploading an asset | The name of the asset you want to upload.   Required when uploading an asset.                                                                                                                |
| `asset-content-type`      | Required when uploading an asset | The content-type of the asset you want to upload. See the [supported Media Types].  Required when uploading an asset.                                                                        |

## Outputs

| Output                       | Description                                                       |
|------------------------------|-------------------------------------------------------------------|
| `release-id`                 | The id of the release.                                            |
| `release-html-url`           | URL to the Release HTML Page                                      |
| `asset-upload-url`           | URL for uploading assets to the release                           |
| `asset-browser-download-url` | URL users can navigate to in order to download the uploaded asset |

## Usage Examples

```yml
on:
  pull_request:
    types: [opened, reopened, synchronize, closed]

env:
  PROJECT_ROOT: './src/MyProj'
  DEPLOY_ZIP: 'published_app.zip'

jobs:
  create-prebuilt-artifacts-and-release:
    runs-on: ubuntu-latest

    steps:
      - name: Determine commitish to build and tag
        uses: actions/github-script@v6
        with:
          script: |
            const targetRef = '${{ github.base_ref }}';
            const sourceRef = '${{ github.head_ref }}';
            const mergeRef = '${{ github.ref }}';

            const prClosed = '${{ github.event.action }}' === 'closed';
            const prMerged = '${{ github.event.pull_request.merged }}' === 'true';
            const prMergedToMain = prMerged && targetRef === 'main';
            const isPreRelease = !prMergedToMain
            const doBuild = prClosed && !prMerged? false : true;

            const refToBuildAndTag = prMergedToMain ? mergeRef : sourceRef;

            core.exportVariable('REF_TO_BUILD', refToBuildAndTag);
            core.exportVariable('IS_PRERELEASE', isPreRelease);
            core.exportVariable('DO_BUILD', doBuild);

      - uses: actions/checkout@v3
        if: env.DO_BUILD == 'true'
        with:
          fetch-depth: 0
          ref: ${{ env.REF_TO_BUILD }}

      - name: Calculate next version
        id: version
        if: env.DO_BUILD == 'true'
        uses: im-open/git-version-lite@v2
        with:
          calculate-prerelease-version: true
          branch-name: ${{ github.head_ref }}

      - name: Build, Publish and Zip App
        if: env.DO_BUILD == 'true'
        working-directory: ${{ env.PROJECT_ROOT }}
        run: |
          dotnet publish -c Release -o ./published_app
          (cd published_app && zip -r ../${{env.DEPLOY_ZIP}} .)

      - name: Create Release
        if: env.DO_BUILD == 'true'
        id: create_release
        # You may also reference just the major or major.minor version.
        uses: im-open/create-release@v3.2.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          tag-name: ${{ steps.version.outputs.VERSION }}
          commitish: ${{ env.REF_TO_BUILD }}
          prerelease: ${{ env.IS_PRERELEASE }}
          asset-path: ${{ env.PROJECT_ROOT }}/${{ env.DEPLOY_ZIP }}
          asset-name: ${{ env.DEPLOY_ZIP }}
          asset-content-type: application/zip
          # The release might already exist if you hit 're-run jobs' on a workflow run that already completed
          # once. Creating a release when one already exists will fail, add the arg here to just delete it.
          delete-existing-release: true
```

## Contributing

When creating PRs, please review the following guidelines:

- [ ] The action code does not contain sensitive information.
- [ ] At least one of the commit messages contains the appropriate `+semver:` keywords listed under [Incrementing the Version] for major and minor increments.
- [ ] The action has been recompiled.  See [Recompiling Manually] for details.
- [ ] The README.md has been updated with the latest version of the action.  See [Updating the README.md] for details.
- [ ] Any tests in the [build-and-review-pr] workflow are passing

### Incrementing the Version

This repo uses [git-version-lite] in its workflows to examine commit messages to determine whether to perform a major, minor or patch increment on merge if [source code] changes have been made.  The following table provides the fragment that should be included in a commit message to active different increment strategies.

| Increment Type | Commit Message Fragment                     |
|----------------|---------------------------------------------|
| major          | +semver:breaking                            |
| major          | +semver:major                               |
| minor          | +semver:feature                             |
| minor          | +semver:minor                               |
| patch          | *default increment type, no comment needed* |

### Source Code Changes

The files and directories that are considered source code are listed in the `files-with-code` and `dirs-with-code` arguments in both the [build-and-review-pr] and [increment-version-on-merge] workflows.

If a PR contains source code changes, the README.md should be updated with the latest action version and the action should be recompiled.  The [build-and-review-pr] workflow will ensure these steps are performed when they are required.  The workflow will provide instructions for completing these steps if the PR Author does not initially complete them.

If a PR consists solely of non-source code changes like changes to the `README.md` or workflows under `./.github/workflows`, version updates and recompiles do not need to be performed.

### Recompiling Manually

This command utilizes [esbuild] to bundle the action and its dependencies into a single file located in the `dist` folder.  If changes are made to the action's [source code], the action must be recompiled by running the following command:

```sh
# Installs dependencies and bundles the code
npm run build
```

### Updating the README.md

If changes are made to the action's [source code], the [usage examples] section of this file should be updated with the next version of the action.  Each instance of this action should be updated.  This helps users know what the latest tag is without having to navigate to the Tags page of the repository.  See [Incrementing the Version] for details on how to determine what the next version will be or consult the first workflow run for the PR which will also calculate the next version.

### Tests

The [build-and-review-pr] workflow includes tests which are linked to a status check. That status check needs to succeed before a PR is merged to the default branch.  When a PR comes from a branch, the `GITHUB_TOKEN` has the necessary permissions required to run the tests successfully.

When a PR comes from a fork, the tests won't have the necessary permissions to run since the `GITHUB_TOKEN` only has `read` access for all scopes. When a PR comes from a fork, the changes should be reviewed, then merged into an intermediate branch by repository owners so tests can be run against the PR changes.  Once the tests have passed, changes can be merged into the default branch.

## Code of Conduct

This project has adopted the [im-open's Code of Conduct](https://github.com/im-open/.github/blob/main/CODE_OF_CONDUCT.md).

## License

Copyright &copy; 2023, Extend Health, LLC. Code released under the [MIT license](LICENSE).

<!-- Links -->
[Incrementing the Version]: #incrementing-the-version
[Recompiling Manually]: #recompiling-manually
[Updating the README.md]: #updating-the-readmemd
[source code]: #source-code-changes
[usage examples]: #usage-examples
[build-and-review-pr]: ./.github/workflows/build-and-review-pr.yml
[increment-version-on-merge]: ./.github/workflows/increment-version-on-merge.yml
[esbuild]: https://esbuild.github.io/getting-started/#bundling-for-node
[git-version-lite]: https://github.com/im-open/git-version-lite
[create-release]: https://github.com/actions/create-release
[upload-release-asset]: https://github.com/actions/upload-release-asset
[im-open/delete-release-by-tag]: https://github.com/im-open/delete-release-by-tag
[im-open/upload-release-asset]: https://github.com/im-open/upload-release-asset
[supported Media Types]: https://www.iana.org/assignments/media-types/media-types.xhtml
