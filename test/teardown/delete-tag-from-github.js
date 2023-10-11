module.exports = async (github, core, tag) => {
  core.info(`\nDelete was called for Tag '${tag}'.`);

  if (tag && tag.length > 0) {
    await github.rest.git
      .deleteRef({
        owner: 'im-open',
        repo: 'create-release',
        ref: `tags/${tag}`
      })
      .then(() => {
        core.info(`\tTag '${tag}' was successfully deleted.`);
      })
      .catch(() => {
        // errors can happen if the tag doesn't exist.  We can ignore those.
        core.info(`\tTag '${tag}' does not appear to exist - do nothing.`);
      });
  } else {
    core.info(`\tTag was not provided - do nothing.`);
  }
};
