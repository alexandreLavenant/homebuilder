const	path = require('path'),
		CleanWebpackPlugin = require('clean-webpack-plugin'),
		HtmlWebpackPlugin = require('html-webpack-plugin'),
		webpack = require('webpack')
		;

module.exports = {
  mode : 'none',
  entry: {
	  'app' : ['./src/scene.js']
  },
  output: {
		filename: 'app.js',
		path: path.resolve(__dirname, 'public')
	},
	devServer: {
			contentBase: './public',
			port: 3000
	},
  module: {
	rules: [
	  {
		test: /\.js$/,
		exclude: /(node_modules|bower_components)/,
		use: {
		  loader: 'babel-loader',
		  options: {
			presets: ['@babel/preset-env']
		  }
		}
	  }
	]
  },
  plugins: [
		new CleanWebpackPlugin(['public']),
		new HtmlWebpackPlugin(),
		new webpack.HotModuleReplacementPlugin()
  ],
};