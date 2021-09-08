# create-release

This action can be used to create a GitHub Release and optionally upload an asset to the release.  This action is based on two GitHub actions [upload-release] and [create-release-asset] which have been deprecated.
   
## Inputs
| Parameter                 | Is Required                      | Default | Description                                                                                                                                |
| ------------------------- | -------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `github-token`            | true                             | N/A     | A token with permission to create and delete releases.  Generally secrets.GITHUB_TOKEN.                                                    |
| `tag-name`                | true                             | N/A     | The name of the tag.                                                                                                                       |
| `release-name`            | false                            | N/A     | The name of the release. Defaults to the tag name if not provided.                                                                         |
| `commitish`               | false                            | N/A     | Any branch or commit SHA the Git tag is created from. Default: SHA of current commit.                                                      |
| `body`                    | false                            | N/A     | Text describing the contents of the release.                                                                                               |
| `body-path`               | false                            | N/A     | Path to file with information about the release.                                                                                           |
| `draft`                   | false                            | `false` | Flag indicating whether to create a draft (unpublished) release or a published one.<br/>Accepted Values: `true\|false`.  Default: `false`. |
| `prerelease`              | false                            | `false` | Flag indicating whether this release is a pre-release or a full release.<br/>Accepted Values: `true\|false`.  Default: `false`.            |
| `delete-existing-release` | false                            | `false` | Flag indicating whether to delete then re-create a release if it already exists.<br/>Accepted Values: `true\|false`.  Default: `false`.    |
| `asset-path`              | Required when uploading an asset | N/A     | The path to the asset you want to upload.  Required when uploading an asset.                                                               |
| `asset-name`              | Required when uploading an asset | N/A     | The name of the asset you want to upload.   Required when uploading an asset.                                                              |
| `asset-content-type`      | Required when uploading an asset | N/A     | The content-type of the asset you want to upload. See the [supported Media Types].  Required when uploading an asset.                      |

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
    types: [opened, reopened, synchronize]

env:
  PROJECT_ROOT: './src/MyProj'
  DEPLOY_ZIP: 'published_app.zip'

jobs:
  create-prebuilt-artifacts-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with: 
          fetch-depth: 0

      - name: Calculate next version
        id: version
        uses: im-open/git-version-lite@v1.0.0
        with:
          calculate-prerelease-version: true
          branch-name: ${{ github.head_ref }}

      - name: Build, Publish and Zip App
        working-directory: ${{ env.PROJECT_ROOT }}
        run: |
          dotnet publish -c Release -o ./published_app 
          (cd published_app && zip -r ../${{env.DEPLOY_ZIP}} .)

      - name: Create Pre-release
        id: create_release
        uses: im-open/create-release@v1.0.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          tag-name: ${{ steps.version.outputs.VERSION }}
          prerelease: true
          asset-path: ${{ env.PROJECT_ROOT }}/${{ env.DEPLOY_ZIP }}
          asset-name: ${{ env.DEPLOY_ZIP }}
          asset-content-type: application/zip
          # The release might already exist if you hit 're-run jobs' on a workflow run that already
          # completed once. Creating a release when one already exists will fail, add the tag to delete it.
          delete-existing-release: true
  run-tests    
    ...
```

## Recompiling

If changes are made to the action's code in this repository, or its dependencies, you will need to re-compile the action.

```sh
# Installs dependencies and bundles the code
npm run build

# Bundle the code (if dependencies are already installed)
npm run bundle
```
These commands utilize [esbuild](https://esbuild.github.io/getting-started/#bundling-for-node) to bundle the action and
its dependencies into a single file located in the `dist` folder.

## Code of Conduct

This project has adopted the [im-open's Code of Conduct](https://github.com/im-open/.github/blob/master/CODE_OF_CONDUCT.md).

## License

Copyright &copy; 2021, Extend Health, LLC. Code released under the [MIT license](LICENSE).

[upload-release]: https://github.com/actions/upload-release
[create-release-asset]: https://github.com/actions/create-release-asset
[supported Media Types]: https://www.iana.org/assignments/media-types/media-types.xhtml