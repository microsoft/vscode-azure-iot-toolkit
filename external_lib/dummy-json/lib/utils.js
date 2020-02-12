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

var seedrandom = require('seedrandom');

// Create an instance of the prng without a seed (so it'll be a random sequence every time)
var prng = seedrandom();

var utils = {
  setRandomSeed: function (seed) {
    prng = seedrandom(seed);
  },

  random: function () {
    return prng();
  },

  randomInt: function (min, max) {
    return Math.floor(utils.random() * (max - min + 1)) + min;
  },

  randomFloat: function (min, max) {
    return utils.random() * (max - min) + min;
  },

  randomBoolean: function () {
    return utils.random() < 0.5;
  },

  randomDate: function (min, max) {
    // We add the timezone offset to avoid the date falling outside the supplied range
    var d = new Date(Math.floor(utils.random() * (max - min)) + min);
    d.setTime(d.getTime() + d.getTimezoneOffset() * 60000);
    return d;
  },

  randomArrayItem: function (array) {
    return array[utils.randomInt(0, array.length - 1)];
  },

  randomChar: function (charset) {
    charset = charset || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return charset.charAt(utils.randomInt(0, charset.length - 1));
  }
};

module.exports = utils;
