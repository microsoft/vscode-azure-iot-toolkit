/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

'use strict';

const copyPlugin = require('copy-webpack-plugin');
const failOnErrorsPlugin = require('fail-on-errors-webpack-plugin');
const terserWebpackPlugin = require('terser-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

/**@type {import('webpack').Configuration}*/
const extensionConfig = {
    target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
    node: {
        __dirname: false
    },
    entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
    output: { // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: "commonjs2",
        devtoolModuleFilenameTemplate: "../[resource-path]",
    },
    devtool: 'source-map',
    externals: {
        vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
        bufferutil: 'commonjs bufferutil',   // bufferutil and utf-8-validate are actually optional binary dependencies. Adding them to suppress the warning https://github.com/websockets/ws/issues/719
        'utf-8-validate': 'commonjs utf-8-validate'
    },
    resolve: { // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
        extensions: ['.ts', '.js'],
        // suppress warning: webpack + require handlebars error
        alias: {
            handlebars: 'handlebars/dist/handlebars.min.js',
            fecha: 'fecha/dist/fecha.min.js'
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [{
                    loader: 'ts-loader'
                }]
            },
            {
                test: /node_modules[/\\]mqtt[/\\]mqtt\.js$/i,   // remove the #! which cannot be handled by Webpack
                use: [{
                    loader: 'shebang-loader'
                }]
            },
            {
                test: /node_modules[/\\]mqtt[/\\]bin[/\\][ps]ub\.js$/i, // remove the #! which cannot be handled by Webpack
                use: [{
                    loader: 'shebang-loader'
                }]
            }
        ]
    },
    plugins: [
        // Ignore all locale files of moment.js, which can save 50KB
        // https://webpack.js.org/plugins/ignore-plugin/#ignore-moment-locales
        new webpack.IgnorePlugin({ resourceRegExp: /^\.\/locale$/ }),
        new webpack.IgnorePlugin({ resourceRegExp: /[\/\\]moment$/ }),
        // Ignore the optional requirement of applicationinsights, which is not used in this extension
        new webpack.IgnorePlugin({ resourceRegExp: /applicationinsights-native-metrics/ }),
        // Ignore optional packages which used by vscode-extension-telemetry
        new webpack.IgnorePlugin({ resourceRegExp: /@opentelemetry\/tracing/ }),
        new webpack.IgnorePlugin({ resourceRegExp: /applicationinsights-native-metrics/ }),
        // Suppress warnings of known dynamic require
        new webpack.ContextReplacementPlugin(
            /applicationinsights[\/\\]out[\/\\]AutoCollection/,
            false,
            /$^/
        ),
        new webpack.ContextReplacementPlugin(
            /ms-rest[\/\\]lib/,
            false,
            /$^/
        ),
        new webpack.ContextReplacementPlugin(
            /applicationinsights[\/\\]out[\/\\]Library/,
            false,
            /$^/
        ),
        // Pack node_modules/getos/logic/*.js
        new webpack.ContextReplacementPlugin(
            /getos/,
            /logic[\/\\].*\.js/
        ),
        // Express
        new webpack.ContextReplacementPlugin(
            /express[\/\\]lib/,
            false,
            /$^/
        ),
        // Numbro
        new webpack.ContextReplacementPlugin(
            /numbro/,
            false,
            /$^/
        ),
        // Copy required resources for Azure treeview
        new copyPlugin({
            patterns: [
                {
                    from: 'node_modules/vscode-azureextensionui/resources/**/*.svg'
                }
            ]
        }),
        // Fail on warnings so that CI can report new warnings which require attention
        new failOnErrorsPlugin({
            failOnErrors: true,
            failOnWarnings: true,
        })
    ],
    optimization: {
        minimizer: [
            new terserWebpackPlugin({
                terserOptions: {
                    mangle: false,
                    keep_fnames: true
                }
            })
        ]
    }
}

const simulatorConfig = {
    entry: './resources/simulator/main.js', 
    output: {
        path: path.resolve(__dirname, 'resources', 'simulator', 'scripts'),
        filename: 'simulator.js',
    },
    devtool: 'source-map',
    resolve: {
        extensions: ['.js'],
        alias: {
            vue: 'vue/dist/vue.js'
        },
    },
    optimization: {
        splitChunks: {
          cacheGroups: {
            commons: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendor",
              chunks: "initial",
              filename: 'vendor.js'
            },
          },
        },
      },
}

const welcomeConfig = {
    entry: './resources/welcome/main.js', 
    output: {
        path: path.resolve(__dirname, 'resources', 'welcome', 'scripts'),
        filename: 'welcome.js',
    },
    devtool: 'source-map',
    resolve: {
        extensions: ['.js'],
    },
    optimization: {
        splitChunks: {
          cacheGroups: {
            commons: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendor",
              chunks: "initial",
              filename: 'vendor.js'
            },
          },
        },
      },
}
module.exports = [extensionConfig, simulatorConfig, welcomeConfig];
