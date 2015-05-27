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
vers.translate(1, 3, '1to3', '3to1');
vers.translate(2, 5, '2to5', '5to2');
vers.translate(2, 3, '2to3', '3to2');
vers.translate(3, 4, '3to4', '4to3');
vers.translate(4, 5, '4to5', '5to4');
vers.translate(5, 6, '5to6', '6to5');

/*
 1  2  3  4  5
 |_____|
    |__|
    |________|
       |__|
          |__|
 */

describe('Vers', function() {
  it('should find the shortest path', function() {
    var path = vers._findPath(1, 6);
    console.log(path);
  });
});
