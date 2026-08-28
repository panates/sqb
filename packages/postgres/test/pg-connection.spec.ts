import type { QueryRequest } from '@sqb/connect';
import { expect } from 'expect';
import { PgConnection } from '../src/pg-connection.js';

describe('postgres:PgConnection', () => {
  const connection = new PgConnection({} as any);

  describe('_normalizeNamedParams', () => {
    function normalize(sql: string, params?: any) {
      const request: QueryRequest = { sql, params };
      (connection as any)._normalizeNamedParams(request);
      return request;
    }

    it('should replace a named param with a positional one', () => {
      const r = normalize('select :a as a', { a: 1 });
      expect(r.sql).toStrictEqual('select $1 as a');
      expect(r.params).toStrictEqual([1]);
    });

    it('should reuse the same index for a repeated param', () => {
      const r = normalize('select :a, :b, :a', { a: 1, b: 2 });
      expect(r.sql).toStrictEqual('select $1, $2, $1');
      expect(r.params).toStrictEqual([1, 2]);
    });

    it('should not treat ":name" inside a string literal as a param', () => {
      const r = normalize("select :a as a, 'literal :notparam text' as lit", {
        a: 1,
      });
      expect(r.sql).toStrictEqual(
        "select $1 as a, 'literal :notparam text' as lit",
      );
      expect(r.params).toStrictEqual([1]);
    });

    it('should not treat the second ":" of a "::" cast as a param', () => {
      const r = normalize('select :a::text as a', { a: 1 });
      expect(r.sql).toStrictEqual('select $1::text as a');
      expect(r.params).toStrictEqual([1]);
    });

    it('should not treat ":name" inside a quoted identifier as a param', () => {
      const r = normalize('select :a, "col:name" from t', { a: 1 });
      expect(r.sql).toStrictEqual('select $1, "col:name" from t');
      expect(r.params).toStrictEqual([1]);
    });

    it('should leave an array-slice expression untouched', () => {
      const r = normalize('select arr[2:4], :a', { a: 1 });
      expect(r.sql).toStrictEqual('select arr[2:4], $1');
      expect(r.params).toStrictEqual([1]);
    });

    it('should not confuse a cast on a string literal with a param', () => {
      const r = normalize("select :a, '2024-01-01'::date as d", { a: 1 });
      expect(r.sql).toStrictEqual("select $1, '2024-01-01'::date as d");
      expect(r.params).toStrictEqual([1]);
    });

    it('should handle a chained (double) cast', () => {
      const r = normalize('select :a, x::text::varchar as v', { a: 1 });
      expect(r.sql).toStrictEqual('select $1, x::text::varchar as v');
      expect(r.params).toStrictEqual([1]);
    });

    it('should not let a shorter param name match a prefix of a longer one', () => {
      const r = normalize('select :a, :ab', { a: 1, ab: 2 });
      expect(r.sql).toStrictEqual('select $1, $2');
      expect(r.params).toStrictEqual([1, 2]);
    });

    it('should assign indexes by order of appearance in the SQL, not in the params object', () => {
      const r = normalize('select :b, :a', { a: 1, b: 2 });
      expect(r.sql).toStrictEqual('select $1, $2');
      expect(r.params).toStrictEqual([2, 1]);
    });

    it('should treat param names as case-sensitive', () => {
      const r = normalize('select :a, :A', { a: 1, A: 2 });
      expect(r.sql).toStrictEqual('select $1, $2');
      expect(r.params).toStrictEqual([1, 2]);
    });

    it('should leave sql and params untouched when there is no named param', () => {
      const r = normalize('select 1');
      expect(r.sql).toStrictEqual('select 1');
      expect(r.params).toBeUndefined();
    });

    it('should not throw for a "::" cast when params is not an object', () => {
      expect(() => normalize('select x::text')).not.toThrow();
      const r = normalize('select x::text');
      expect(r.sql).toStrictEqual('select x::text');
    });

    it('should throw if params is not a key/value object but sql has a named param', () => {
      expect(() => normalize('select :a', [1] as any)).toThrow(
        '"params" should be an key, value object',
      );
    });

    it('should assign each named param its own index and value, even when one of them has no matching value', () => {
      const r = normalize('select :a, :missing, :b', { a: 1, b: 2 });
      expect(r.sql).toStrictEqual('select $1, $2, $3');
      expect(r.params).toStrictEqual([1, undefined, 2]);
    });
  });
});
