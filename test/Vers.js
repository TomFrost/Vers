/*
 * Vers
 * Copyright (c) 2017 Tom Shawver
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
      inst.addConverter(2, 3, function(obj) { obj.version = 3; });
      return inst.toLatest({version: 2}).should.become({version: 3});
    });
    it('should assume version 1 with default versionGetter', function() {
      var inst = new Vers();
      inst.addConverter(1, 2, function(obj) { obj.version = 2; });
      return inst.toLatest({}).should.become({version: 2});
    });
    it('should accept a custom versionGetter', function() {
      var inst = new Vers({getVersion: function(obj) { return obj.v; }});
      inst.addConverter(2, 3, function(obj) { obj.v = 3; });
      return inst.toLatest({v: 2}).should.become({v: 3});
    });
    it('should construct as a function call', function() {
      var inst = Vers();
      should.exist(inst);
      inst.should.be.instanceOf(Vers);
    });
  });
  describe('fromTo()', function() {
    it('should immediately resolve if object is at target', function() {
      var inst = new Vers();
      var obj = {version: 2, original: true};
      inst.addConverter(1, 2, function() { return {version: 2}; });
      return inst.fromTo(2, 2, obj).should.become(obj);
    });
    it('should override getVersion with from param', function() {
      var inst = new Vers();
      var testObj = {version: 1};
      inst.addConverter(2, 3, function(obj) { obj.version = 3; });
      return inst.fromTo(2, 3, testObj).should.become({version: 3});
    });
    it('should choose the shortest possible path', function() {
      var inst = new Vers();
      inst.addConverter(1, 2,
        function(obj) { obj.p.push('1to2'); },
        function(obj) { obj.p.push('2to1'); });
      inst.addConverter(1, 3,
        function(obj) { obj.p.push('1to3'); },
        function(obj) { obj.p.push('3to1'); });
      inst.addConverter(1, 5,
        function(obj) { obj.p.push('1to5'); });
      inst.addConverter(2, 3,
        function(obj) { obj.p.push('2to3'); },
        function(obj) { obj.p.push('3to2'); });
      inst.addConverter(3, 4,
        function(obj) { obj.p.push('3to4'); },
        function(obj) { obj.p.push('4to3'); });
      return Promise.all([
        inst.fromTo(1, 4, {p: []}).should.become({p: ['1to3', '3to4']}),
        inst.fromTo(4, 1, {p: []}).should.become({p: ['4to3', '3to1']}),
        inst.fromTo(3, 5, {p: []}).should.become({p: ['3to1', '1to5']})
      ]);
    });
    it('should reject when there is no path', function() {
      var inst = new Vers();
      return inst.fromTo(1, 2, {}).should.reject;
    });
    it('should cache paths', function() {
      var inst = new Vers();
      inst.addConverter(1, 2, function(obj) { obj.version = 2; });
      return inst.fromTo(1, 2, {}).then(function(obj) {
        obj.should.have.property('version').equal(2);
        inst._converters = {};
        return inst.fromTo(1, 2, {});
      }).should.become({version: 2});
    });
  });
  describe('fromToLatest()', function() {
    it('should allow from to be declared', function() {
      var inst = new Vers();
      inst.addConverter(2, 3, function(obj) { obj.version = 3; });
      return inst.fromToLatest(2, {}).should.become({version: 3});
    });
    it('should allow latest to be specified', function() {
      var inst = new Vers({latest: 'chicken'});
      var cow = {sound: 'moo'};
      inst.addConverter('cow', 'pig', function(obj) { obj.sound = 'oink'; });
      inst.addConverter('cow', 'chicken', function(obj) {
        obj.feathers = true;
      });
      return inst.fromToLatest('cow', cow).should.become({
        sound: 'moo',
        feathers: true
      });
    });
  });
  describe('to()', function() {
    it('should upgrade to a non-maximum version', function() {
      var inst = new Vers();
      inst.addConverter(1, 2, function(obj) { obj.version = 2; });
      inst.addConverter(2, 3, function(obj) { obj.version = 3; });
      return inst.to(2, {version: 1}).should.become({version: 2});
    });
    it('should reject if version cannot be inferred', function() {
      var inst = new Vers({getVersion: function(obj) { return obj.v; }});
      inst.addConverter(1, 2, function(obj) { obj.v = 2; });
      return inst.to(2, {}).should.reject;
    });
    it('should count 0 as an applicable version', function() {
      var inst = new Vers();
      inst.addConverter(0, 1, function(obj) { obj.version = 1; });
      return inst.to(1, {version: 0}).should.become({version: 1});
    });
  });
  describe('toLatest()', function() {
    it('should infer the latest integer version', function() {
      var inst = new Vers();
      inst.addConverter(1, 2, function(obj) { obj.version = 2; });
      inst.addConverter(2, 3, function(obj) { obj.version = 3; });
      return inst.toLatest({}).should.become({version: 3});
    });
  });
  describe('addConverter()', function() {
    it('should allow going backwards', function() {
      var inst = new Vers();
      inst.addConverter(1, 2, function(obj) { obj.version = 2; },
        function(obj) { obj.version = 1; });
      return inst.to(1, {version: 2}).should.become({version: 1});
    });
    it('should overwrite translators', function() {
      var inst = new Vers();
      inst.addConverter('cow', 'pig',
        function(obj) { obj.sound = 'oink'; },
        function(obj) { obj.sound = 'moo'; });
      inst.addConverter('cow', 'pig',
        function(obj) { obj.sound = 'OINK'; },
        function(obj) { obj.sound = 'MOO'; });
      return Promise.all([
        inst.fromTo('cow', 'pig', {}).should.become({sound: 'OINK'}),
        inst.fromTo('pig', 'cow', {}).should.become({sound: 'MOO'})
      ]);
    });
  });
});
