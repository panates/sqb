import {
  And,
  Between,
  Eq,
  Exists,
  Gt,
  Gte,
  Ilike,
  In,
  Is,
  IsNot,
  Like,
  Lt,
  Lte,
  Ne,
  Not,
  NotBetween,
  NotExists,
  NotILike,
  NotIn,
  NotLike,
  OperatorType,
  Or,
  Param,
  Raw,
  Select,
  SerializationType,
} from '../../src/index.js';

describe('serialize "Operators"', () => {
  const options = {
    dialect: 'test',
    prettyPrint: false,
  };

  /*
   *
   */
  describe('and operator', () => {
    it('should initialize', () => {
      const op = And();
      expect(op._type).toStrictEqual(SerializationType.LOGICAL_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.and);
    });

    it('should skip empty items', () => {
      const query = Select()
        .from('table1')
        // @ts-ignore
        .where(
          And(
            // @ts-ignore
            null,
            undefined,
            // @ts-ignore
            0,
            Eq('id', 1),
          ),
        );
      const result = query.generate(options);
      expect(result.sql).toStrictEqual('select * from table1 where (id = 1)');
    });

    it('should validate items are Operator', () => {
      expect(() =>
        // @ts-ignore
        And(new Date()),
      ).toThrow('type required');
    });

    it('should serialize', () => {
      const query = Select()
        .from('table1')
        .where(And(Eq('id', 1), Eq('id', 2)));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where (id = 1 and id = 2)',
      );
    });

    it('should wrap native objects to operators', () => {
      const query = Select()
        .from('table1')
        .where({ and: [{ id: 1 }, { id: 2 }] }, { and: { id: 3 } });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where (id = 1 and id = 2) and (id = 3)',
      );
    });
  });

  /*
   *
   */
  describe('or operator', () => {
    it('should initialize', () => {
      const op = Or();
      expect(op._type).toStrictEqual(SerializationType.LOGICAL_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.or);
    });

    it('should skip empty items', () => {
      // @ts-ignore
      const query = Select()
        .from('table1')
        .where(
          Or(
            // @ts-ignore
            null,
            undefined,
            // @ts-ignore
            0,
            Eq('id', 1),
          ),
        );
      const result = query.generate(options);
      expect(result.sql).toStrictEqual('select * from table1 where (id = 1)');
    });

    it('should validate items are Operator', () => {
      expect(() =>
        // @ts-ignore
        Or(new Date()),
      ).toThrow('type required');
    });

    it('should serialize', () => {
      const query = Select()
        .from('table1')
        .where(Or(Eq('id', 1), Eq('id', 2)));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where (id = 1 or id = 2)',
      );
    });

    it('should serialize complex', () => {
      const query = Select()
        .from('table1')
        .where(Or(And(Eq('id', 1), Eq('id', 2)), Eq('id', 3)));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where ((id = 1 and id = 2) or id = 3)',
      );
    });

    it('should wrap native objects to operators', () => {
      const query = Select()
        .from('table1')
        .where({ OR: [{ id: 1 }, { id: 2 }] });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where (id = 1 or id = 2)',
      );
    });
  });

  /*
   *
   */
  describe('eq (=) operator', () => {
    it('should initialize', () => {
      const op = Eq('id', 1);
      expect(op._type).toStrictEqual(SerializationType.COMPARISON_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.eq);
    });

    it('should serialize', () => {
      const query = Select().from('table1').where(Eq('id', 1));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual('select * from table1 where id = 1');
    });

    it('should use Serializable as first arg', () => {
      const query = Select()
        .from('table1')
        .where(Eq(Raw('id'), 1));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual('select * from table1 where id = 1');
    });

    it('should serialize params', () => {
      const query = Select()
        .from('table1')
        .where(Eq('id', Param('id')));
      const result = query.generate(
        Object.assign({ params: { id: 1 } }, options),
      );
      expect(result.sql).toStrictEqual('select * from table1 where id = :id');
      expect(result.params.id).toStrictEqual(1);
    });

    it('should wrap native objects to operators', () => {
      const query = Select().from('table1').where({ a: 1, 'b=': 2, 'c =': 3 });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where a = 1 and b = 2 and c = 3',
      );
    });

    it('should use sub select sqls', () => {
      const query = Select()
        .from('table1')
        .where({ a: Select('i').from('table2') });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where a = (select i from table2)',
      );
    });
  });

  /*
   *
   */
  describe('ne (!=) operator', () => {
    it('should initialize', () => {
      const op = Ne('id', 1);
      expect(op._type).toStrictEqual(SerializationType.COMPARISON_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.ne);
    });

    it('should serialize', () => {
      const query = Select().from('table1').where(Ne('id', 1));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual('select * from table1 where id != 1');
    });

    it('should use Serializable as first arg', () => {
      const query = Select()
        .from('table1')
        .where(Ne(Raw('id'), 1));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual('select * from table1 where id != 1');
    });

    it('should serialize params', () => {
      const query = Select()
        .from('table1')
        .where(Ne('id', Param('id')));
      const result = query.generate(
        Object.assign({ params: { id: 1 } }, options),
      );
      expect(result.sql).toStrictEqual('select * from table1 where id != :id');
      expect(result.params.id).toStrictEqual(1);
    });

    it('should wrap native objects to operators', () => {
      const query = Select().from('table1').where({ 'a!=': 1, 'b !=': 2 });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where a != 1 and b != 2',
      );
    });
  });

  /*
   *
   */
  describe('gt (>) operator', () => {
    it('should initialize', () => {
      const op = Gt('id', 1);
      expect(op._type).toStrictEqual(SerializationType.COMPARISON_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.gt);
    });

    it('should serialize', () => {
      const query = Select().from('table1').where(Gt('id', 1));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual('select * from table1 where id > 1');
    });

    it('should wrap native objects to operators', () => {
      const query = Select().from('table1').where({ 'a>': 1, 'b >': 2 });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where a > 1 and b > 2',
      );
    });
  });

  /*
   *
   */
  describe('lt (<) operator', () => {
    it('should initialize', () => {
      const op = Lt('id', 1);
      expect(op._type).toStrictEqual(SerializationType.COMPARISON_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.lt);
    });

    it('should serialize', () => {
      const query = Select().from('table1').where(Lt('id', 1));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual('select * from table1 where id < 1');
    });

    it('should wrap native objects to operators', () => {
      const query = Select().from('table1').where({ 'a<': 1, 'b <': 2 });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where a < 1 and b < 2',
      );
    });
  });

  /*
   *
   */
  describe('gte (>=) operator', () => {
    it('should initialize', () => {
      const op = Gte('id', 1);
      expect(op._type).toStrictEqual(SerializationType.COMPARISON_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.gte);
    });

    it('should serialize', () => {
      const query = Select().from('table1').where(Gte('id', 1));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual('select * from table1 where id >= 1');
    });

    it('should wrap native objects to operators', () => {
      const query = Select().from('table1').where({ 'a>=': 1, 'b >=': 2 });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where a >= 1 and b >= 2',
      );
    });
  });

  /*
   *
   */
  describe('lte (<=) operator', () => {
    it('should initialize', () => {
      const op = Lte('id', 1);
      expect(op._type).toStrictEqual(SerializationType.COMPARISON_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.lte);
    });

    it('should serialize', () => {
      const query = Select().from('table1').where(Lte('id', 1));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual('select * from table1 where id <= 1');
    });

    it('should wrap native objects to operators', () => {
      const query = Select().from('table1').where({ 'a<=': 1, 'b <=': 2 });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where a <= 1 and b <= 2',
      );
    });
  });

  /*
   *
   */
  describe('between operator', () => {
    it('should initialize', () => {
      const op = Between('id', 1, 3);
      expect(op._type).toStrictEqual(SerializationType.COMPARISON_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.between);
    });

    it('should serialize', () => {
      const query = Select()
        .from('table1')
        .where(Between('id', 10, 20));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where id between 10 and 20',
      );
    });

    it('should serialize with one arg', () => {
      const query = Select()
        .from('table1')
        .where(Between('id', [10]));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where id between 10 and 10',
      );
    });

    it('should serialize with one array arg', () => {
      const query = Select()
        .from('table1')
        .where(Between('id', [10, 20]));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where id between 10 and 20',
      );
    });

    it('should serialize params', () => {
      const query = Select()
        .from('table1')
        .where(Between('id', Param('id1'), Param('id2')));
      const result = query.generate(
        Object.assign(
          {
            params: {
              id1: 1,
              id2: 5,
            },
          },
          options,
        ),
      );
      expect(result.sql).toStrictEqual(
        'select * from table1 where id between :id1 and :id2',
      );
      expect(result.params.id1).toStrictEqual(1);
      expect(result.params.id2).toStrictEqual(5);
    });

    it('should wrap native objects to operators', () => {
      const query = Select()
        .from('table1')
        .where({ 'a btw': [1, 2], 'b between': 2 });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where a between 1 and 2 and b between 2 and 2',
      );
    });
  });

  /*
   *
   */
  describe('notBetween operator', () => {
    it('should initialize', () => {
      const op = NotBetween('id', 1, 3);
      expect(op._type).toStrictEqual(SerializationType.COMPARISON_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.notBetween);
    });

    it('should serialize', () => {
      const query = Select()
        .from('table1')
        .where(NotBetween('id', 10, 20));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where id not between 10 and 20',
      );
    });

    it('should serialize with one arg', () => {
      const query = Select()
        .from('table1')
        .where(NotBetween('id', [10]));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where id not between 10 and 10',
      );
    });

    it('should serialize with one array arg', () => {
      const query = Select()
        .from('table1')
        .where(NotBetween('id', [10, 20]));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where id not between 10 and 20',
      );
    });

    it('should serialize params', () => {
      const query = Select()
        .from('table1')
        .where(NotBetween('id', Param('id1'), Param('id2')));
      const result = query.generate(
        Object.assign(
          {
            params: {
              id1: 1,
              id2: 5,
            },
          },
          options,
        ),
      );
      expect(result.sql).toStrictEqual(
        'select * from table1 where id not between :id1 and :id2',
      );
      expect(result.params.id1).toStrictEqual(1);
      expect(result.params.id2).toStrictEqual(5);
    });

    it('should wrap native objects to operators', () => {
      const query = Select()
        .from('table1')
        .where({ 'a nbtw': [1, 2], 'b notBetween': 2 });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where a not between 1 and 2 and b not between 2 and 2',
      );
    });
  });

  /*
   *
   */
  describe('like operator', () => {
    it('should initialize', () => {
      const op = Like('id', 1);
      expect(op._type).toStrictEqual(SerializationType.COMPARISON_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.like);
    });

    it('should serialize', () => {
      const query = Select()
        .from('table1')
        .where(Like('name', "John's"), Like('id', '10'));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        "select * from table1 where name like 'John''s' and id like '10'",
      );
    });

    it('should serialize params', () => {
      const query = Select()
        .from('table1')
        .where(Like('name', Param('name')));
      const result = query.generate(
        Object.assign(
          {
            params: {
              name: 'John',
            },
          },
          options,
        ),
      );
      expect(result.sql).toStrictEqual(
        'select * from table1 where name like :name',
      );
      expect(result.params.name).toStrictEqual('John');
    });

    it('should wrap native objects to operators', () => {
      const query = Select().from('table1').where({ 'a like': '1' });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual("select * from table1 where a like '1'");
    });
  });

  /*
   *
   */
  describe('notLike operator', () => {
    it('should initialize', () => {
      const op = NotLike('id', 1);
      expect(op._type).toStrictEqual(SerializationType.COMPARISON_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.notLike);
    });

    it('should serialize', () => {
      const query = Select()
        .from('table1')
        .where(NotLike('name', "John's"), NotLike('id', '10'));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        "select * from table1 where name not like 'John''s' and id not like '10'",
      );
    });

    it('should serialize params', () => {
      const query = Select()
        .from('table1')
        .where(NotLike('name', Param('name')));
      const result = query.generate(
        Object.assign(
          {
            params: {
              name: 'John',
            },
          },
          options,
        ),
      );
      expect(result.sql).toStrictEqual(
        'select * from table1 where name not like :name',
      );
      expect(result.params.name).toStrictEqual('John');
    });

    it('should wrap native objects to operators', () => {
      const query = Select().from('table1').where({ 'a !like': '1' });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        "select * from table1 where a not like '1'",
      );
    });
  });

  /*
   *
   */
  describe('ilike operator', () => {
    it('should initialize', () => {
      const op = Ilike('id', 1);
      expect(op._type).toStrictEqual(SerializationType.COMPARISON_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.iLike);
    });

    it('should serialize', () => {
      const query = Select()
        .from('table1')
        .where(Ilike('name', "John's"), Ilike('id', '10'));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        "select * from table1 where name ilike 'John''s' and id ilike '10'",
      );
    });

    it('should serialize params', () => {
      const query = Select()
        .from('table1')
        .where(Ilike('name', Param('name')));
      const result = query.generate(
        Object.assign(
          {
            params: {
              name: 'John',
            },
          },
          options,
        ),
      );
      expect(result.sql).toStrictEqual(
        'select * from table1 where name ilike :name',
      );
      expect(result.params.name).toStrictEqual('John');
    });

    it('should wrap native objects to operators', () => {
      const query = Select().from('table1').where({ 'a ilike': '1' });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        "select * from table1 where a ilike '1'",
      );
    });
  });

  /*
   *
   */
  describe('notILike operator', () => {
    it('should initialize', () => {
      const op = NotILike('id', 1);
      expect(op._type).toStrictEqual(SerializationType.COMPARISON_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.notILike);
    });

    it('should serialize', () => {
      const query = Select()
        .from('table1')
        .where(NotILike('name', "John's"), NotILike('id', '10'));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        `select * from table1 where name not ilike 'John''s' and id not ilike '10'`,
      );
    });

    it('should serialize params', () => {
      const query = Select()
        .from('table1')
        .where(NotILike('name', Param('name')));
      const result = query.generate(
        Object.assign(
          {
            params: {
              name: 'John',
            },
          },
          options,
        ),
      );
      expect(result.sql).toStrictEqual(
        'select * from table1 where name not ilike :name',
      );
      expect(result.params.name).toStrictEqual('John');
    });

    it('should wrap native objects to operators', () => {
      const query = Select().from('table1').where({ 'a !ilike': '1' });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        "select * from table1 where a not ilike '1'",
      );
    });
  });

  /*
   *
   */
  describe('in operator', () => {
    it('should initialize', () => {
      const op = In('id', 1);
      expect(op._type).toStrictEqual(SerializationType.COMPARISON_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.in);
    });

    it('should serialize', () => {
      const query = Select()
        .from('table1')
        .where(Or(In('id', 1), In('id', [4, 5, 6])));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where (id in (1) or id in (4,5,6))',
      );
    });

    it('should serialize params', () => {
      const query = Select()
        .from('table1')
        .where(In('id', Param('id')));
      const result = query.generate(
        Object.assign(
          {
            params: {
              id: [1, 2, 3],
            },
          },
          options,
        ),
      );
      expect(result.sql).toStrictEqual('select * from table1 where id in :id');
      expect(result.params.id).toStrictEqual([1, 2, 3]);
    });

    it('should wrap native objects to operators', () => {
      const query = Select()
        .from('table1')
        .where({ 'a in': 1, 'b in': [1, 2] });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where a in (1) and b in (1,2)',
      );
    });

    it('should ignore if list is empty', () => {
      const query = Select()
        .from('table1')
        .where(Or(In('id', [])));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual('select * from table1');
    });
  });

  /*
   *
   */
  describe('notIn operator', () => {
    it('should initialize', () => {
      const op = NotIn('id', 1);
      expect(op._type).toStrictEqual(SerializationType.COMPARISON_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.notIn);
    });

    it('should serialize', () => {
      const query = Select()
        .from('table1')
        .where(Or(NotIn('id', 1), NotIn('id', [4, 5, 6])));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where (id not in (1) or id not in (4,5,6))',
      );
    });

    it('should serialize params', () => {
      const query = Select()
        .from('table1')
        .where(NotIn('id', Param('id')));
      const result = query.generate(
        Object.assign(
          {
            params: {
              id: [1, 2, 3],
            },
          },
          options,
        ),
      );
      expect(result.sql).toStrictEqual(
        'select * from table1 where id not in :id',
      );
      expect(result.params.id).toStrictEqual([1, 2, 3]);
    });

    it('should wrap native objects to operators', () => {
      const query = Select()
        .from('table1')
        .where({ 'a !in': 1, 'b !in': [1, 2] });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where a not in (1) and b not in (1,2)',
      );
    });
  });

  /*
   *
   */
  describe('is operator', () => {
    it('should initialize', () => {
      const op = Is('id', null);
      expect(op._type).toStrictEqual(SerializationType.COMPARISON_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.is);
    });

    it('should serialize', () => {
      const query = Select().from('table1').where(Is('id', null));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual('select * from table1 where id is null');
    });

    it('should wrap native objects to operators', () => {
      const query = Select().from('table1').where({ 'a.a is': null });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where a.a is null',
      );
    });
  });

  /*
   *
   */
  describe('not operator', () => {
    it('should initialize', () => {
      const op = IsNot('id', 1);
      expect(op._type).toStrictEqual(SerializationType.COMPARISON_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.isNot);
    });

    it('should serialize', () => {
      const query = Select().from('table1').where(IsNot('id', null));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where id is not null',
      );
    });

    it('should wrap native objects to operators', () => {
      const query = Select().from('table1').where({ 'a !is': null });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where a is not null',
      );
    });
  });

  /*
   *
   */
  describe('exists operator', () => {
    const q = Select().from('table2');

    it('should initialize', () => {
      const op = Exists(q);
      expect(op._type).toStrictEqual(SerializationType.COMPARISON_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.exists);
    });

    it('should serialize', () => {
      const query = Select().from('table1').where(Exists(q));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where exists (select * from table2)',
      );
    });

    it('should wrap native objects to operators', () => {
      const query = Select().from('table1').where({ exists: q });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where exists (select * from table2)',
      );
    });
  });

  /*
   *
   */
  describe('notExists operator', () => {
    const q = Select().from('table2');

    it('should initialize', () => {
      const op = NotExists(q);
      expect(op._type).toStrictEqual(SerializationType.COMPARISON_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.notExists);
    });

    it('should serialize', () => {
      const query = Select().from('table1').where(NotExists(q));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where not exists (select * from table2)',
      );
    });

    it('should wrap native objects to operators', () => {
      const query = Select().from('table1').where({ '!exists': q });
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where not exists (select * from table2)',
      );
    });
  });

  /*
   *
   */
  describe('not operator', () => {
    const q = Eq('field1', 1);

    it('should initialize', () => {
      const op = Not(q);
      expect(op._type).toStrictEqual(SerializationType.NEGATIVE_EXPRESSION);
      expect(op._operatorType).toStrictEqual(OperatorType.not);
    });

    it('should serialize', () => {
      const query = Select().from('table1').where(Not(q));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where not field1 = 1',
      );
    });
  });

  /*
   *
   */
  describe('common', () => {
    it('should use sub-select as expression', () => {
      const query = Select()
        .from('table1')
        .where(Eq(Select('id').from('table'), 1));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where (select id from table) = 1',
      );
    });

    it('should use raw as expression', () => {
      const query = Select()
        .from('table1')
        .where(Eq(Raw('id'), 1));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual('select * from table1 where id = 1');
    });

    it('should use sub-select as value', () => {
      const query = Select()
        .from('table1')
        .where(Eq('id', Select('id').from('table')));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        'select * from table1 where id = (select id from table)',
      );
    });

    it('should use raw as value', () => {
      const query = Select()
        .from('table1')
        .where(Eq('id', Raw('1')));
      const result = query.generate(options);
      expect(result.sql).toStrictEqual('select * from table1 where id = 1');
    });

    it('should use Date as value', () => {
      const query = Select()
        .from('table1')
        .where(
          Eq('dt1', new Date(Date.UTC(2017, 0, 15, 10, 30, 0, 0))),
          Eq('dt2', new Date(Date.UTC(2017, 10, 1, 8, 5, 50, 0))),
        );
      const result = query.generate(options);
      expect(result.sql).toStrictEqual(
        "select * from table1 where dt1 = '2017-01-15 10:30:00' and dt2 = '2017-11-01 08:05:50'",
      );
    });

    it('should use null as params', () => {
      const query = Select()
        .from('table1')
        .where(Eq('id', Param('id')));
      const result = query.generate(
        Object.assign(
          {
            params: {
              id: null,
            },
          },
          options,
        ),
      );
      expect(result.sql).toStrictEqual('select * from table1 where id = :id');
      expect(result.params.id).toStrictEqual(null);
    });

    it('should validate when wrapping native objects to operators', () => {
      expect(() => Select().from('table1').where({ '#id=': 3 })).toThrow(
        'is not a valid',
      );
    });

    it('should validate when wrapping native objects to operators', () => {
      expect(() => Select().from('table1').where({ 'id non': 3 })).toThrow(
        'Unknown operator',
      );
    });
  });
});
