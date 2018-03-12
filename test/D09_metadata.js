/* eslint-disable */
'use strict';

const assert = require('assert');
const sqb = require('../lib/index');

describe('Metadata', function() {

  let pool;
  let metaData;
  before(() => {
    pool = new sqb.Pool({
      dialect: 'test',
      user: 'user',
      schema: 'schema',
      prettyPrint: false
    });

  });
  let schema;
  let table;
  let options = {
    prettyPrint: false
  };

  after(() => pool.close(true));

  it('should validate arguments', function() {
    try {
      new sqb.DBMeta();
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
  });

  it('should initialize with pool', function() {
    metaData = new sqb.DBMeta(pool);
  });

  it('should initialize with connection', function(done) {
    pool.connect((err, conn) => {
      assert(!err, err);
      conn.release();
      new sqb.DBMeta(conn);
      done();
    });
  });

  it('should create select query for schemas', function() {
    let q = metaData.select().from('schemas').generate(options);
    assert.equal(q.sql, 'select * from (select * from schemas) schemas');
  });

  it('should create select query for tables', function() {
    let q = metaData.select().from('tables').generate(options);
    assert.equal(q.sql, 'select * from (select * from tables) tables');
  });

  it('should create select query for columns', function() {
    let q = metaData.select().from('columns').generate(options);
    assert.equal(q.sql, 'select * from (select * from columns) columns');
  });

  it('should create select query for primary keys', function() {
    let q = metaData.select().from('primary_keys').generate(options);
    assert.equal(q.sql, 'select * from (select * from primary_keys) primary_keys');
  });

  it('should create select query for foreign keys', function() {
    let q = metaData.select().from('foreign_keys').generate(options);
    assert.equal(q.sql, 'select * from (select * from foreign_keys) foreign_keys');
  });

  it('should not create select query for invalid selector', function() {
    try {
      metaData.select().from('invalid').generate(options);
    } catch (e) {
      return;
    }
    throw new Error('Failed');
  });

  it('should get schema objects', function(done) {
    metaData.getSchemas((err, schemas) => {
      if (err)
        return done(err);
      try {
        assert.equal(schemas.length, 2);
        schema = schemas[0];
        assert.equal(schema.meta.schema_name, 'SCHEMA_1');
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('should get schema objects (Promise)', function(done) {
    metaData.getSchemas('schema_1').then((schemas) => {
      assert.equal(schemas.length, 2);
      schema = schemas[0];
      assert.equal(schema.meta.schema_name, 'SCHEMA_1');
      done();
    }).catch((reason) => {
      done(reason);
    });
  });

  describe('SchemaMeta', function() {
    it('should get table object', function(done) {
      schema.getTables((err, tables) => {
        if (err)
          return done(err);
        try {
          assert.equal(tables.length, 3);
          table = tables[0];
          assert.equal(table.meta.table_name, 'AIRPORTS');
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('should get table objects (Promise)', function(done) {
      schema.getTables('airports').then((tables) => {
        assert.equal(tables.length, 3);
        table = tables[0];
        assert.equal(table.meta.table_name, 'AIRPORTS');
        done();
      }).catch((reason) => {
        done(reason);
      });
    });
  });

  describe('TableMeta', function() {

    it('should get columns', function(done) {
      table.getColumns((err, result) => {
        if (err)
          return done(err);
        try {
          assert(result);
          assert(result.ID);
          assert.equal(result.ID.data_type, 'TEXT');
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('should get columns (Promise)', function() {
      return table.getColumns().then((result) => {
        assert(result);
        assert(result.ID);
        assert.equal(result.ID.data_type, 'TEXT');
      });
    });

    it('should get primary key', function(done) {
      table.getPrimaryKey(function(err, result) {
        if (err)
          return done(err);
        try {
          assert(result);
          assert.equal(result.columns, 'ID');
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('should get primary key (Promise)', function() {
      return table.getPrimaryKey().then((result) => {
        assert(result);
        assert.equal(result.columns, 'ID');
      });
    });

    it('should get foreign keys', function(done) {
      table.getForeignKeys((err, result) => {
        if (err)
          return done(err);
        try {
          assert(result);
          assert(result.length);
          assert.equal(result[0].column, 'REGION');
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('should get foreign keys (Promise)', function() {
      return table.getForeignKeys().then((result) => {
        assert(result);
        assert(result.length);
        assert.equal(result[0].column, 'REGION');
      });
    });

  });

  it('should call invalidate()', function() {
    assert(metaData.invalidate());
  });

  describe('Finalize', function() {
    it('shutdown pool', function(done) {
      pool.close(done);
    });
  });

});
