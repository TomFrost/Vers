/*
 * Vers
 * Copyright (c) 2015 TechnologyAdvice
 */

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var should = require('chai').should();
var Vers = require('../lib/vers');

chai.use(chaiAsPromised);

var vers = new Vers();
vers.translate(1, 2, '1to2', '2to1');
vers.translate(1, 3, '1to3', '3to1');
vers.translate(2, 3, '2to3', '3to2');
vers.translate(2, 4, '2to4', '4to2');
vers.translate(3, 5, '3to5', '5to3');
vers.translate(4, 5, '4to5', '5to4');
vers.translate(4, 6, '4to6', '6to4');
vers.translate(5, 6, '5to6', '6to5');

describe('Vers', function() {
  it('should find the shortest path', function() {
    var path = vers._findPath(1, 4, true);
    console.log(path);
  });
});
