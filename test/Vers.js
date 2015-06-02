/*
 * Vers
 * Copyright (c) 2015 TechnologyAdvice
 */

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var should = require('chai').should();
var Vers = require('../lib/Vers');

chai.use(chaiAsPromised);

describe('Vers', function() {
  describe('Constructor', function() {
    it('should construct with default versionGetter', function() {
      var inst = new Vers();
      inst.translate(2, 3, function(obj) { obj.version = 3; });
      return inst.toLatest({version: 2}).should.become({version: 3});
    });
    it('should assume version 1 with default versionGetter', function() {
      var inst = new Vers();
      inst.translate(1, 2, function(obj) { obj.version = 2; });
      return inst.toLatest({}).should.become({version: 2});
    });
    it('should accept a custom versionGetter', function() {
      var inst = new Vers({getVersion: function(obj) { return obj.v; }});
      inst.translate(2, 3, function(obj) { obj.v = 3; });
      return inst.toLatest({v: 2}).should.become({v: 3});
    });
    it('should construct as a function call', function() {
      var inst = Vers();
      should.exist(inst);
      inst.should.be.instanceOf(Vers);
    });
  });
  describe('fromToLatest()', function() {
    it('should allow from to be declared', function() {
      var inst = new Vers();
      inst.translate(2, 3, function(obj) { obj.version = 3; });
      return inst.fromToLatest(2, {}).should.become({version: 3});
    });
  });
  describe('to()', function() {
    it('should upgrade to a non-maximum version', function() {
      var inst = new Vers();
      inst.translate(1, 2, function(obj) { obj.version = 2; });
      inst.translate(2, 3, function(obj) { obj.version = 3; });
      return inst.to(2, {version: 1}).should.become({version: 2});
    });
    it('should reject if version cannot be inferred', function() {
      var inst = new Vers(function(obj) { return obj.v; });
      inst.translate(1, 2, function(obj) { obj.v = 2; });
      return inst.to(2, {}).should.reject;
    });
  });
  describe('toLatest()', function() {
    it('should infer the latest integer version', function() {
      var inst = new Vers();
      inst.translate(1, 2, function(obj) { obj.version = 2; });
      inst.translate(2, 3, function(obj) { obj.version = 3; });
      return inst.toLatest({}).should.become({version: 3});
    });
  });
  describe('translate()', function() {
    it('should allow going backwards', function() {
      var inst = new Vers();
      inst.translate(1, 2, function(obj) { obj.version = 2; },
        function(obj) { obj.version = 1; });
      return inst.to(1, {version: 2}).should.become({version: 1});
    });
  });
});
