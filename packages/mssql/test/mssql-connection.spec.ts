import type { QueryRequest } from '@sqb/connect';
import { expect } from 'expect';
import { MssqlConnection } from '../src/mssql-connection.js';

describe('mssql:MssqlConnection', () => {
  const connection = new MssqlConnection({} as any);

  describe('_normalizeNamedParams', () => {
    function normalize(sql: string, params?: Record<string, any>) {
      const request: QueryRequest = { sql, params };
      (connection as any)._normalizeNamedParams(request);
      return request;
    }

    it('should replace a named param with "@name"', () => {
      const r = normalize('select :a as a', { a: 1 });
      expect(r.sql).toStrictEqual('select @a as a');
    });

    it('should replace multiple distinct params', () => {
      const r = normalize('select :a, :b', { a: 1, b: 2 });
      expect(r.sql).toStrictEqual('select @a, @b');
    });

    it('should replace every occurrence of a repeated param', () => {
      const r = normalize('select :a, :b, :a', { a: 1, b: 2 });
      expect(r.sql).toStrictEqual('select @a, @b, @a');
    });

    it('should leave sql untouched when there is no named param', () => {
      const r = normalize('select 1');
      expect(r.sql).toStrictEqual('select 1');
    });

    it('should not rewrite the params object itself', () => {
      const params = { a: 1 };
      const r = normalize('select :a', params);
      expect(r.params).toBe(params);
    });

    it('should not treat ":name" inside a string literal as a param', () => {
      const r = normalize("select :a as a, 'literal :notparam text' as lit", {
        a: 1,
      });
      expect(r.sql).toStrictEqual(
        "select @a as a, 'literal :notparam text' as lit",
      );
    });

    it('should not treat ":name" inside a double-quoted identifier as a param', () => {
      const r = normalize('select :a, "col:name" from t', { a: 1 });
      expect(r.sql).toStrictEqual('select @a, "col:name" from t');
    });

    it('should not treat ":name" inside a bracket-quoted identifier as a param', () => {
      const r = normalize('select :a, [col:name] from t', { a: 1 });
      expect(r.sql).toStrictEqual('select @a, [col:name] from t');
    });
  });
});
