/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

'use strict';

const CopyWebpackPlugin = require('copy-webpack-plugin')
const path = require('path');

/**@type {import('webpack').Configuration}*/
const config = {
    target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
    node: {
        __dirname: false
    },
    entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
    output: { // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
        path: path.resolve(__dirname, 'dist', 'scripts'),
        filename: 'extension.js',
        libraryTarget: "commonjs2",
        devtoolModuleFilenameTemplate: "../[resource-path]",
    },
    devtool: 'source-map',
    externals: {
        vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
        'utf-8-validate': 'utf-8-validate'
    },
    resolve: { // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
        extensions: ['.ts', '.js']
    },
    module: {
        // require(expr)
        // exprContextRegExp: /$^/,
        // exprContextCritical: false,
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [{
                    loader: 'ts-loader',
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
        new CopyWebpackPlugin([{
            from: 'node_modules/clipboardy/fallbacks',
            to: '../fallbacks'
        }])
    ]
}

module.exports = config;