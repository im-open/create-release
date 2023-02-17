# create-release

This action can be used to create a GitHub Release and optionally upload an asset to the release.  This action is based on two GitHub actions [create-release] and [upload-release-asset] which have been deprecated.

This action has the option of uploading a single asset to the release.  If more than one artifact is needed or if the artifact is not available when the release is created the [im-open/upload-release-asset] action can be used.

This action also has the option of deleting the release if it already exists.  If a workflow tries to create a release that already exists it will fail which may happen when a workflow is re-run.  This functionality is also provided in the [im-open/delete-release-by-tag] action if a release needs to be deleted before the release is created.

## Index

- [Inputs](#inputs)
- [Outputs](#outputs)
- [Usage Examples](#usage-examples)
- [Contributing](#contributing)
  - [Recompiling](#recompiling)
  - [Incrementing the Version](#incrementing-the-version)
- [Code of Conduct](#code-of-conduct)
- [License](#license)

## Inputs
| Parameter                 | Is Required                      | Description                                                                                                                                |
| ------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `github-token`            | true                             | A token with permission to create and delete releases.  Generally secrets.GITHUB_TOKEN.                                                    |
| `tag-name`                | true                             | The name of the tag.                                                                                                                       |
| `release-name`            | false                            | The name of the release. Defaults to the tag name if not provided.                                                                         |
| `commitish`               | true                             | Specifies the commitish value that identifies the commit to tag. Can be any branch or commit SHA.                                          |
| `body`                    | false                            | Text describing the contents of the release.                                                                                               |
| `body-path`               | false                            | Path to file with information about the release.                                                                                           |
| `draft`                   | false                            | Flag indicating whether to create a draft (unpublished) release or a published one.<br/>Accepted Values: `true\|false`.  Default: `false`. |
| `prerelease`              | false                            | Flag indicating whether this release is a pre-release or a full release.<br/>Accepted Values: `true\|false`.  Default: `false`.            |
| `delete-existing-release` | false                            | Flag indicating whether to delete then re-create a release if it already exists.<br/>Accepted Values: `true\|false`.  Default: `false`.    |
| `asset-path`              | Required when uploading an asset | The path to the asset you want to upload.  Required when uploading an asset.                                                               |
| `asset-name`              | Required when uploading an asset | The name of the asset you want to upload.   Required when uploading an asset.                                                              |
| `asset-content-type`      | Required when uploading an asset | The content-type of the asset you want to upload. See the [supported Media Types].  Required when uploading an asset.                      |

## Outputs
| Output                       | Description                                                       |
| ---------------------------- | ----------------------------------------------------------------- |
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
        uses: im-open/create-release@v3
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

When creating new PRs please ensure:

1. For major or minor changes, at least one of the commit messages contains the appropriate `+semver:` keywords listed under [Incrementing the Version](#incrementing-the-version).
1. The action code does not contain sensitive information.

When a pull request is created and there are changes to code-specific files and folders, the build workflow will run and it will recompile the action and push a commit to the branch if the PR author has not done so. The usage examples in the README.md will also be updated with the next version if they have not been updated manually. The following files and folders contain action code and will trigger the automatic updates:

- action.yml
- package.json
- package-lock.json
- src/\*\*
- dist/\*\*

There may be some instances where the bot does not have permission to push changes back to the branch though so these steps should be done manually for those branches. See [Recompiling Manually](#recompiling-manually) and [Incrementing the Version](#incrementing-the-version) for more details.

### Recompiling Manually

If changes are made to the action's code in this repository, or its dependencies, the action can be re-compiled by running the following command:

```sh
# Installs dependencies and bundles the code
npm run build

# Bundle the code (if dependencies are already installed)
npm run bundle
```

These commands utilize [esbuild](https://esbuild.github.io/getting-started/#bundling-for-node) to bundle the action and
its dependencies into a single file located in the `dist` folder.

### Incrementing the Version

Both the build and PR merge workflows will use the strategies below to determine what the next version will be.  If the build workflow was not able to automatically update the README.md action examples with the next version, the README.md should be updated manually as part of the PR using that calculated version.

This action uses [git-version-lite] to examine commit messages to determine whether to perform a major, minor or patch increment on merge.  The following table provides the fragment that should be included in a commit message to active different increment strategies.
| Increment Type | Commit Message Fragment                     |
| -------------- | ------------------------------------------- |
| major          | +semver:breaking                            |
| major          | +semver:major                               |
| minor          | +semver:feature                             |
| minor          | +semver:minor                               |
| patch          | *default increment type, no comment needed* |

## Code of Conduct

This project has adopted the [im-open's Code of Conduct](https://github.com/im-open/.github/blob/master/CODE_OF_CONDUCT.md).

## License

Copyright &copy; 2021, Extend Health, LLC. Code released under the [MIT license](LICENSE).

[git-version-lite]: https://github.com/im-open/git-version-lite
[create-release]: https://github.com/actions/create-release
[upload-release-asset]: https://github.com/actions/upload-release-asset
[im-open/delete-release-by-tag]: https://github.com/im-open/delete-release-by-tag
[im-open/upload-release-asset]: https://github.com/im-open/upload-release-asset
[supported Media Types]: https://www.iana.org/assignments/media-types/media-types.xhtml
