const path = require('path');
const slsw = require('serverless-webpack');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: slsw.lib.entries,
  target: 'node',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/.prisma/client/libquery_engine-rhel-openssl-1.0.x.so.node',
          to: 'node_modules/.prisma/client/libquery_engine-rhel-openssl-1.0.x.so.node',
        },
        {
          from: 'node_modules/.prisma/client/schema.prisma',
          to: 'node_modules/.prisma/client/schema.prisma',
        },
        {
          from: 'node_modules/@prisma/client',
          to: 'node_modules/@prisma/client',
        },
      ],
    }),
  ],
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      'class-transformer/storage': require.resolve(
        'class-transformer/cjs/storage.js',
      ),
    },
  },
  output: {
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
  },
};
