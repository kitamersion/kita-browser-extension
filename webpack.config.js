const Dotenv = require("dotenv-webpack");
const path = require("path");
const HWP = require('html-webpack-plugin'); 

const isProduction = process.env.APPLICATION_ENVIRONMENT === 'prod';
const isDevelopment = !isProduction;

module.exports = {
  mode: isDevelopment ? 'development' : 'production',
  
  output: {
    publicPath: "/",
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: false, // Don't clean the dist folder
  },

  entry: {
    background: path.join(__dirname, "/src/pages/background/index.ts"),
    content: path.join(__dirname, "/src/pages/content/index.ts"),
    popup: path.join(__dirname, "/src/pages/popup/index.ts"),
    settings: path.join(__dirname, "/src/pages/settings/index.ts"),
    statistics: path.join(__dirname, "/src/pages/statistics/index.ts"),
  },

  // Enable source maps for development
  devtool: isDevelopment ? 'cheap-module-source-map' : 'source-map',

  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
    alias: {
      "@": path.resolve(__dirname, "/src"),
    },
  },

  // Watch options for better development experience
  watchOptions: {
    ignored: /node_modules/,
    poll: 1000, // Check for changes every second
  },

  devServer: {
    port: 3001,
    historyApiFallback: true,
    hot: true,
  },

  module: {
    rules: [
      {
        test: /\.(css|s[ac]ss)$/i,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.(png|jpe?g|gif|jp2|webp)$/,
        loader: "file-loader",
        options: {
          name: "[name].[ext]",
        },
      },
    ],
  },

  plugins: [
    new Dotenv({ systemvars: true }), 
    new HWP({template: path.join(__dirname,"/src/pages/popup/popup.html"), chunks: ["popup"], filename: "popup.html"}),
    new HWP({template: path.join(__dirname,"/src/pages/settings/settings.html"), chunks: ["settings"], filename: "settings.html"}),
    new HWP({template: path.join(__dirname,"/src/pages/statistics/statistics.html"), chunks: ["statistics"], filename: "statistics.html"}),
  ],
};
