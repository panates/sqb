import type { ClientConfiguration } from '@sqb/connect';
import oracledb from 'oracledb';
import { getInsertSQLsForTestData } from '../../../connect/test/_shared/adapter-tests.js';
import { clientConfigurationToDriver } from '../../src/helpers.js';

const schema = process.env.ORASCHEMA || 'test';
let schemaCreated = false;
export const sqls: string[] = [];

export const dbConfig: ClientConfiguration = {
  driver: 'oracledb',
  host: process.env.ORAHOST || '127.0.0.1',
  port: parseInt(process.env.ORAPORT || '0', 10) || 1521,
  database: process.env.ORADATABASE || 'FREEPDB1',
  user: process.env.ORAUSER || 'system',
  password: process.env.ORAPASSWORD || 'Sqb_Test_2024!',
  schema: process.env.ORASCHEMA || 'test',
  defaults: {
    fieldNaming: 'lowercase',
  },
};

// drop sequences
for (const s of [
  'customers_id_seq',
  'tags_id_seq',
  'parents_id_seq',
  'children_id_seq',
  'grandchildren_id_seq',
]) {
  sqls.push(`
BEGIN
EXECUTE IMMEDIATE 'DROP SEQUENCE ${schema}.${s}';
EXCEPTION
   WHEN OTHERS THEN
      IF SQLCODE != -2289 THEN RAISE; END IF;
END;`);
}

// drop tables
for (const s of [
  'grandchildren',
  'children',
  'parents',
  'customer_tags',
  'customer_details',
  'customer_vip_details',
  'customers',
  'tags',
  'countries',
  'continents',
]) {
  sqls.push(`
BEGIN
EXECUTE IMMEDIATE 'DROP TABLE ${schema}.${s}';
EXCEPTION
   WHEN OTHERS THEN
      IF SQLCODE != -942 THEN 
        RAISE; 
      END IF;
END;`);
}

// Create tables
sqls.push(
  `CREATE TABLE ${schema}.continents (
  code    VARCHAR2(5),
  name  VARCHAR2(16)  
)`,
  `
ALTER TABLE ${schema}.continents ADD CONSTRAINT pk_continents 
  PRIMARY KEY (code)
`,
);

sqls.push(
  `CREATE TABLE ${schema}.countries (
  code    VARCHAR2(5),
  name  VARCHAR2(16),
  phone_code VARCHAR2(8),
  has_market smallint default 1,
  continent_code VARCHAR2(2)
)`,
  `
ALTER TABLE ${schema}.countries ADD 
  CONSTRAINT pk_countries PRIMARY KEY (code)
`,
  `
ALTER TABLE ${schema}.countries ADD CONSTRAINT fk_countries_continent_code 
  FOREIGN KEY (continent_code) REFERENCES ${schema}.continents (code)
`,
);

sqls.push(
  `
CREATE TABLE ${schema}.customers
(
  id INTEGER not null,
  given_name  VARCHAR2(64),
  family_name  VARCHAR2(64),
  gender  CHAR(1),
  birth_date  DATE,
  city  VARCHAR2(32),
  country_code  VARCHAR2(5),
  active smallint default 1,
  vip smallint default 0,
  address_city varchar(32),
  address_street varchar(256),
  address_zip_code varchar(8),
  custom_data clob,
  created_at timestamp default CURRENT_TIMESTAMP,
  updated_at timestamp
)`,
  `
ALTER TABLE ${schema}.customers ADD
  CONSTRAINT pk_customers PRIMARY KEY (id)
`,
  `
ALTER TABLE ${schema}.customers ADD CONSTRAINT fk_customers_country_code 
  FOREIGN KEY (country_code) REFERENCES ${schema}.COUNTRIES (code)
`,
  `
CREATE SEQUENCE ${schema}.customers_id_seq START WITH 10000
`,
  `
CREATE OR REPLACE TRIGGER ${schema}.customers_bi 
BEFORE INSERT ON ${schema}.customers 
FOR EACH ROW
BEGIN
  if :new.id is null then
      select ${schema}.customers_id_seq.nextval into :new.id from dual;
  end if;
END;
`,
  `
CREATE OR REPLACE TRIGGER ${schema}.customers_bu 
BEFORE UPDATE ON ${schema}.customers 
FOR EACH ROW
BEGIN
  :new.updated_at := CURRENT_TIMESTAMP;
END;
`,
);

sqls.push(
  `
CREATE TABLE ${schema}.customer_details
(
  customer_id INTEGER not null,
  notes  VARCHAR2(256),
  alerts  VARCHAR2(256)
)
`,
  `
ALTER TABLE ${schema}.customer_details ADD CONSTRAINT fk_cust_det_customer_id 
  FOREIGN KEY (customer_id) REFERENCES ${schema}.CUSTOMERS (id)
`,
);

sqls.push(
  `
CREATE TABLE ${schema}.customer_vip_details
(
  customer_id INTEGER not null,
  notes  VARCHAR2(256),
  rank  integer
)
`,
  `
ALTER TABLE ${schema}.customer_vip_details ADD CONSTRAINT fk_cust_vip_det_customer_id 
  FOREIGN KEY (customer_id) REFERENCES ${schema}.CUSTOMERS (id)
`,
);

sqls.push(
  `
CREATE TABLE ${schema}.tags
(
  id    INTEGER,
  name  VARCHAR2(16),
  color  VARCHAR2(16),
  active smallint default 1
)
`,
  `
ALTER TABLE ${schema}.tags ADD CONSTRAINT tags_PK PRIMARY KEY (id)
`,
  `
CREATE SEQUENCE ${schema}.tags_id_seq START WITH 100
`,
  `
CREATE OR REPLACE TRIGGER ${schema}.tags_bi 
BEFORE INSERT ON ${schema}.tags 
FOR EACH ROW
BEGIN
  if :new.id is null then
      select ${schema}.tags_id_seq.nextval into :new.id from dual;
  end if;
END;`,
);

sqls.push(
  `
CREATE TABLE ${schema}.customer_tags (
  customer_id INTEGER not null,
  tag_id    INTEGER not null,
  deleted smallint default 0
)`,
  `
ALTER TABLE ${schema}.customer_tags ADD CONSTRAINT customer_tags_PK 
  PRIMARY KEY (customer_id, tag_id)
`,
  `
ALTER TABLE ${schema}.customer_tags ADD CONSTRAINT FK_cust_tags_customer_id 
  FOREIGN KEY (customer_id) REFERENCES ${schema}.customers (id)
`,
  `
ALTER TABLE ${schema}.customer_tags ADD CONSTRAINT FK_cust_tags_tag_id
 FOREIGN KEY (tag_id) REFERENCES ${schema}.tags (id)`,
);

sqls.push(
  `
CREATE TABLE ${schema}.parents
(
  id    INTEGER not null,
  name  VARCHAR2(64)
)`,
  `
ALTER TABLE ${schema}.parents ADD CONSTRAINT pk_parents PRIMARY KEY (id)
`,
  `
CREATE SEQUENCE ${schema}.parents_id_seq START WITH 1
`,
  `
CREATE OR REPLACE TRIGGER ${schema}.parents_bi
BEFORE INSERT ON ${schema}.parents
FOR EACH ROW
BEGIN
  if :new.id is null then
      select ${schema}.parents_id_seq.nextval into :new.id from dual;
  end if;
END;
`,
);

sqls.push(
  `
CREATE TABLE ${schema}.children
(
  id        INTEGER not null,
  name      VARCHAR2(64),
  parent_id INTEGER
)`,
  `
ALTER TABLE ${schema}.children ADD CONSTRAINT pk_children PRIMARY KEY (id)
`,
  `
ALTER TABLE ${schema}.children ADD CONSTRAINT fk_children_parent_id
  FOREIGN KEY (parent_id) REFERENCES ${schema}.parents (id)
`,
  `
CREATE SEQUENCE ${schema}.children_id_seq START WITH 1
`,
  `
CREATE OR REPLACE TRIGGER ${schema}.children_bi
BEFORE INSERT ON ${schema}.children
FOR EACH ROW
BEGIN
  if :new.id is null then
      select ${schema}.children_id_seq.nextval into :new.id from dual;
  end if;
END;
`,
);

sqls.push(
  `
CREATE TABLE ${schema}.grandchildren
(
  id       INTEGER not null,
  name     VARCHAR2(64),
  child_id INTEGER
)`,
  `
ALTER TABLE ${schema}.grandchildren ADD CONSTRAINT pk_grandchildren PRIMARY KEY (id)
`,
  `
ALTER TABLE ${schema}.grandchildren ADD CONSTRAINT fk_grandchildren_child_id
  FOREIGN KEY (child_id) REFERENCES ${schema}.children (id)
`,
  `
CREATE SEQUENCE ${schema}.grandchildren_id_seq START WITH 1
`,
  `
CREATE OR REPLACE TRIGGER ${schema}.grandchildren_bi
BEFORE INSERT ON ${schema}.grandchildren
FOR EACH ROW
BEGIN
  if :new.id is null then
      select ${schema}.grandchildren_id_seq.nextval into :new.id from dual;
  end if;
END;
`,
);

export async function createTestSchema() {
  if (schemaCreated) return;
  const connection = await oracledb.getConnection(
    clientConfigurationToDriver(dbConfig),
  );
  try {
    // A real Oracle "schema" is a user, and the DDL below is all
    // schema-qualified (`${schema}.table`) - that user must already exist
    // for it to succeed, so provision a fresh one here rather than relying
    // on it having been created out-of-band on whatever server this
    // connects to.
    await connection.execute(
      `BEGIN
         EXECUTE IMMEDIATE 'DROP USER ${schema} CASCADE';
       EXCEPTION
         WHEN OTHERS THEN IF SQLCODE != -1918 THEN RAISE; END IF;
       END;`,
    );
    await connection.execute(
      `CREATE USER ${schema} IDENTIFIED BY "${schema}_Test_2024!"`,
    );
    await connection.execute(
      `GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, CREATE TRIGGER, UNLIMITED TABLESPACE TO ${schema}`,
    );
    // @sqb/oracle's own adapter queries v$mystat (via SELECT_CATALOG_ROLE)
    // to read back the session id on connect.
    await connection.execute(`GRANT SELECT_CATALOG_ROLE TO ${schema}`);
    await connection.commit();

    for (const s of sqls) {
      try {
        await connection.execute(s);
      } catch (e: any) {
        e.message += '\n' + s;
        throw e;
      }
    }
    const dataFiles = getInsertSQLsForTestData({ dialect: 'oracle', schema });
    for (const table of dataFiles) {
      let sql = 'begin\n';
      for (const s of table.scripts) {
        sql += `     execute immediate '${s.replace(/'/g, "''")}';\n`;
      }
      sql += "execute immediate 'commit';\n end;";
      try {
        await connection.execute(sql);
      } catch (e: any) {
        e.message += '\n' + sql;
        throw e;
      }
    }
    schemaCreated = true;
  } finally {
    await connection.close();
  }
}
