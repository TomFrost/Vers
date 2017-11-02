/*
 * Vers
 * Copyright (c) 2017 Tom Shawver
 */

/* global describe it */

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const dirtyChai = require('dirty-chai')
const Vers = require('../lib/Vers')

chai.should()
chai.use(chaiAsPromised)
chai.use(dirtyChai)

describe('Vers', () => {
  describe('Constructor', () => {
    it('constructs with default versionGetter', () => {
      const inst = new Vers()
      inst.addConverter(2, 3, (obj) => { obj.version = 3 })
      return inst.toLatest({version: 2}).should.become({version: 3})
    })
    it('assumes version 1 with default versionGetter', () => {
      const inst = new Vers()
      inst.addConverter(1, 2, (obj) => { obj.version = 2 })
      return inst.toLatest({}).should.become({version: 2})
    })
    it('accepts a custom versionGetter', () => {
      const inst = new Vers({getVersion: (obj) => { return obj.v }})
      inst.addConverter(2, 3, (obj) => { obj.v = 3 })
      return inst.toLatest({v: 2}).should.become({v: 3})
    })
  })
  describe('fromTo()', () => {
    it('immediately resolves if object is at target', () => {
      const inst = new Vers()
      const obj = {version: 2, original: true}
      inst.addConverter(1, 2, () => { return {version: 2} })
      return inst.fromTo(2, 2, obj).should.become(obj)
    })
    it('overrides getVersion with from param', () => {
      const inst = new Vers()
      const testObj = {version: 1}
      inst.addConverter(2, 3, (obj) => { obj.version = 3 })
      return inst.fromTo(2, 3, testObj).should.become({version: 3})
    })
    it('chooses the shortest possible path', () => {
      const inst = new Vers()
      inst.addConverter(1, 2,
        (obj) => { obj.p.push('1to2') },
        (obj) => { obj.p.push('2to1') })
      inst.addConverter(1, 3,
        (obj) => { obj.p.push('1to3') },
        (obj) => { obj.p.push('3to1') })
      inst.addConverter(1, 5,
        (obj) => { obj.p.push('1to5') })
      inst.addConverter(2, 3,
        (obj) => { obj.p.push('2to3') },
        (obj) => { obj.p.push('3to2') })
      inst.addConverter(3, 4,
        (obj) => { obj.p.push('3to4') },
        (obj) => { obj.p.push('4to3') })
      return Promise.all([
        inst.fromTo(1, 4, {p: []}).should.become({p: ['1to3', '3to4']}),
        inst.fromTo(4, 1, {p: []}).should.become({p: ['4to3', '3to1']}),
        inst.fromTo(3, 5, {p: []}).should.become({p: ['3to1', '1to5']})
      ])
    })
    it('rejects when there is no path', () => {
      const inst = new Vers()
      return inst.fromTo(1, 2, {}).should.be.rejected()
    })
    it('caches paths', () => {
      const inst = new Vers()
      inst.addConverter(1, 2, (obj) => { obj.version = 2 })
      return inst.fromTo(1, 2, {}).then((obj) => {
        obj.should.have.property('version').equal(2)
        inst._converters = {}
        return inst.fromTo(1, 2, {})
      }).should.become({version: 2})
    })
  })
  describe('fromToLatest()', () => {
    it('allows from to be declared', () => {
      const inst = new Vers()
      inst.addConverter(2, 3, (obj) => { obj.version = 3 })
      return inst.fromToLatest(2, {}).should.become({version: 3})
    })
    it('allows latest to be specified', () => {
      const inst = new Vers({latest: 'chicken'})
      const cow = {sound: 'moo'}
      inst.addConverter('cow', 'pig', (obj) => { obj.sound = 'oink' })
      inst.addConverter('cow', 'chicken', (obj) => {
        obj.feathers = true
      })
      return inst.fromToLatest('cow', cow).should.become({
        sound: 'moo',
        feathers: true
      })
    })
  })
  describe('to()', () => {
    it('upgrades to a non-maximum version', () => {
      const inst = new Vers()
      inst.addConverter(1, 2, (obj) => { obj.version = 2 })
      inst.addConverter(2, 3, (obj) => { obj.version = 3 })
      return inst.to(2, {version: 1}).should.become({version: 2})
    })
    it('rejects if version cannot be inferred', () => {
      const inst = new Vers({getVersion: (obj) => { return obj.v }})
      inst.addConverter(1, 2, (obj) => { obj.v = 2 })
      return inst.to(2, {}).should.be.rejected()
    })
    it('counts 0 as an applicable version', () => {
      const inst = new Vers()
      inst.addConverter(0, 1, (obj) => { obj.version = 1 })
      return inst.to(1, {version: 0}).should.become({version: 1})
    })
  })
  describe('toLatest()', () => {
    it('infers the latest integer version', () => {
      const inst = new Vers()
      inst.addConverter(1, 2, (obj) => { obj.version = 2 })
      inst.addConverter(2, 3, (obj) => { obj.version = 3 })
      return inst.toLatest({}).should.become({version: 3})
    })
  })
  describe('addConverter()', () => {
    it('allows going backwards', () => {
      const inst = new Vers()
      inst.addConverter(1, 2, (obj) => { obj.version = 2 },
        (obj) => { obj.version = 1 })
      return inst.to(1, {version: 2}).should.become({version: 1})
    })
    it('overwrites translators', () => {
      const inst = new Vers()
      inst.addConverter('cow', 'pig',
        (obj) => { obj.sound = 'oink' },
        (obj) => { obj.sound = 'moo' })
      inst.addConverter('cow', 'pig',
        (obj) => { obj.sound = 'OINK' },
        (obj) => { obj.sound = 'MOO' })
      return Promise.all([
        inst.fromTo('cow', 'pig', {}).should.become({sound: 'OINK'}),
        inst.fromTo('pig', 'cow', {}).should.become({sound: 'MOO'})
      ])
    })
  })
})
