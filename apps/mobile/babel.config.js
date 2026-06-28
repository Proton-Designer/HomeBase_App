// Replaces every `import.meta` occurrence with a static stub so libraries
// like zustand can compile under Metro's classic-script web bundle.
const replaceImportMeta = () => ({
  visitor: {
    MetaProperty(path) {
      if (
        path.node.meta &&
        path.node.meta.name === 'import' &&
        path.node.property &&
        path.node.property.name === 'meta'
      ) {
        path.replaceWithSourceString('({env:{MODE:"production"}})');
      }
    },
  },
});

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [replaceImportMeta],
  };
};
