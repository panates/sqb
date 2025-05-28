import { ClientConfiguration } from '@sqb/connect';
import oracledb from 'oracledb';
import { getInsertSQLsForTestData } from '../../../connect/test/_shared/adapter-tests.js';
import { clientConfigurationToDriver } from '../../src/helpers.js';

const schema = process.env.ORASCHEMA || 'test';
let schemaCreated = false;
export const sqls: string[] = [];

export const dbConfig: ClientConfiguration = {
  driver: 'oracledb',
  host: process.env.ORAHOST,
  port: parseInt(process.env.ORAPORT || '0', 10) || 1521,
  database: process.env.ORADATABASE,
  user: process.env.ORAUSER,
  password: process.env.ORAPASSWORD,
  schema: process.env.ORASCHEMA || 'test',
  defaults: {
    fieldNaming: 'lowercase',
  },
};

// drop sequences
for (const s of ['customers_id_seq', 'tags_id_seq']) {
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

export async function createTestSchema() {
  if (schemaCreated) return;
  const connection = await oracledb.getConnection(
    clientConfigurationToDriver(dbConfig),
  );
  try {
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
