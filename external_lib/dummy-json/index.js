// Copyright (c) 2017 Matt Sweetman

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var Handlebars = require('handlebars');
var fecha = require('fecha');
var numbro = require('numbro');
var mockdata = require('./lib/mockdata');
var helpers = require('./lib/helpers');
var utils = require('./lib/utils');

var dummyjson = {
  // Global seed for the random number generator
  seed: null,

  parse: function (string, options) {
    options = options || {};

    // Merge custom mockdata/helpers into the defaults, items with the same name will override
    options.mockdata = Handlebars.Utils.extend({}, mockdata, options.mockdata);
    options.helpers = Handlebars.Utils.extend({}, helpers, options.helpers);

    // If a seed is passed in the options it will override the default one
    utils.setRandomSeed(options.seed || dummyjson.seed);

    // Certain helpers, such as name and email, attempt to synchronise and use the same values when
    // called after one-another. This object acts as a cache so the helpers can share their values.
    options.mockdata.__cache = {};

    return Handlebars.compile(string)(options.mockdata, {
      helpers: options.helpers,
      partials: options.partials
    });
  },

  // Expose the built-in modules so people can use them in their own helpers
  mockdata: mockdata,
  helpers: helpers,
  utils: utils,

  // Also expose the number and date formatters so people can modify their settings
  fecha: fecha,
  numbro: numbro
};

module.exports = dummyjson;
