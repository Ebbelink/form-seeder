const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (_env, argv = {}) => {
  const isProduction = argv.mode === 'production';

  return {
  entry: {
    background: './src/background/index.ts',
    content: './src/page-runtime/index.ts',
    popup: './src/context-panel/index.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  devtool: isProduction ? false : 'source-map',
  optimization: {
    // Keep local/dev output readable for unpacked-extension debugging.
    minimize: isProduction,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/context-panel/popup.html', to: 'popup.html' },
        { from: 'src/context-panel/popup.css', to: 'popup.css' },
        { from: 'icons', to: 'icons' },
      ],
    }),
  ],
  };
};
