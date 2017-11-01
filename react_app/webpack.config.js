const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

module.exports = (env) => {
  env = env || { NODE_ENV: 'development' };
  return {
    devtool: 'source-map',
    entry: ['./src/index.js'],
    output: {
      publicPath: '/',
      path: path.resolve(__dirname, '../public'),
      filename: 'bundle.js',
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          loader: "babel-loader",
          options: {
            presets: ["es2015", "react"]
          }
        }
      ]
    },
    plugins: (() => {
      if (process.env.NODE_ENV == 'production') {
        return [
          new webpack.DefinePlugin({
            'process.env': { NODE_ENV: JSON.stringify('production') }
          }),
          new webpack.optimize.UglifyJsPlugin()
        ];
      } else {
        return [];
      }
    })()
  };
};
