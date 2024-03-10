const Dotenv = require("dotenv-webpack");
const path = require("path");
const HWP = require('html-webpack-plugin'); 

module.exports = {
  output: {
    publicPath: "/",
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js', // Use dynamic filename based on entry key
  },

  entry: {
    popup: path.join(__dirname, "/src/pages/popup/index.ts"),
    content: path.join(__dirname, "/src/pages/content/index.ts"),
  },

  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
    alias: {
      "@": path.resolve(__dirname, "/src"),
    },
  },

  devServer: {
    port: 3001,
    historyApiFallback: true,
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
  ],
};
