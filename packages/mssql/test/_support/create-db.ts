import sql from 'mssql';
import { getInsertSQLsForTestData } from '../../../connect/test/_shared/adapter-tests.js';

const schemaCreated: Record<string, boolean> = {};

function getSql(): string {
  return `
CREATE TABLE continents
(
    code varchar(5) PRIMARY KEY,
    name varchar(16)
);

CREATE TABLE countries
(
    code varchar(5) PRIMARY KEY,
    name varchar(16),
    phone_code varchar(8),
    continent_code varchar(5),
    has_market bit not null default 1,
    CONSTRAINT fk_countries_continent_code FOREIGN KEY (continent_code)
        REFERENCES continents (code)
);

CREATE TABLE customers
(
    id INT IDENTITY(10000,1) PRIMARY KEY,
    given_name varchar(64),
    family_name varchar(64),
    gender char(1),
    birth_date date,
    city varchar(32),
    country_code varchar(5),
    active bit not null default 1,
    vip bit not null default 0,
    address_city varchar(32),
    address_street varchar(256),
    address_zip_code varchar(8),
    custom_data nvarchar(max),
    created_at datetime2 default sysdatetime(),
    updated_at datetime2,
    CONSTRAINT fk_customers_country_code FOREIGN KEY (country_code)
        REFERENCES countries (code)
);

CREATE TABLE customer_details
(
    customer_id INT PRIMARY KEY,
    notes varchar(256),
    alerts varchar(256),
    CONSTRAINT fk_customer_details_id FOREIGN KEY (customer_id)
        REFERENCES customers (id)
);

CREATE TABLE customer_vip_details
(
    customer_id INT PRIMARY KEY,
    [rank] smallint default 0,
    notes varchar(256),
    CONSTRAINT fk_customer_vip_details_id FOREIGN KEY (customer_id)
        REFERENCES customers (id)
);

CREATE TABLE tags
(
    id INT IDENTITY(100,1) PRIMARY KEY,
    name varchar(16),
    color varchar(16),
    active bit not null default 1
);

CREATE TABLE customer_tags
(
    customer_id INT not null,
    tag_id INT not null,
    deleted bit not null default 0,
    PRIMARY KEY (customer_id, tag_id),
    CONSTRAINT fk_customer_tags_customer_id FOREIGN KEY (customer_id)
        REFERENCES customers (id),
    CONSTRAINT fk_customer_tags_tag_id FOREIGN KEY (tag_id)
        REFERENCES tags (id)
);

CREATE TABLE parents
(
    id INT IDENTITY(1,1) PRIMARY KEY,
    name varchar(64)
);

CREATE TABLE children
(
    id INT IDENTITY(1,1) PRIMARY KEY,
    name varchar(64),
    parent_id INT,
    CONSTRAINT fk_children_parent_id FOREIGN KEY (parent_id)
        REFERENCES parents (id)
);

CREATE TABLE grandchildren
(
    id INT IDENTITY(1,1) PRIMARY KEY,
    name varchar(64),
    child_id INT,
    CONSTRAINT fk_grandchildren_child_id FOREIGN KEY (child_id)
        REFERENCES children (id)
);
`;
}

export async function createTestSchema(database: string) {
  if (schemaCreated[database]) return;
  schemaCreated[database] = true;
  const adminPool = new sql.ConnectionPool({
    server: process.env.MSSQL_HOST || 'localhost',
    port: process.env.MSSQL_PORT ? parseInt(process.env.MSSQL_PORT, 10) : 1433,
    user: process.env.MSSQL_USER || 'sa',
    password: process.env.MSSQL_PASSWORD || 'Sqb_Test_2024!',
    options: { encrypt: false, trustServerCertificate: true },
  });
  await adminPool.connect();
  try {
    await adminPool
      .request()
      .query(
        `IF EXISTS (SELECT * FROM sys.databases WHERE name = '${database}') ` +
          `ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE`,
      );
    await adminPool.request().query(`DROP DATABASE IF EXISTS [${database}]`);
    await adminPool.request().query(`CREATE DATABASE [${database}]`);
  } finally {
    await adminPool.close();
  }

  const pool = new sql.ConnectionPool({
    server: process.env.MSSQL_HOST || 'localhost',
    port: process.env.MSSQL_PORT ? parseInt(process.env.MSSQL_PORT, 10) : 1433,
    user: process.env.MSSQL_USER || 'sa',
    password: process.env.MSSQL_PASSWORD || 'Sqb_Test_2024!',
    database,
    options: { encrypt: false, trustServerCertificate: true },
    // SET IDENTITY_INSERT is session-scoped; pin all requests to a single
    // physical connection so it reliably applies to the inserts below.
    pool: { max: 1 },
  });
  await pool.connect();
  try {
    for (const stmt of getSql().split(/\n\n(?=CREATE TABLE)/)) {
      if (stmt.trim()) await pool.request().query(stmt);
    }
    const identityTables = new Set([
      'customers',
      'tags',
      'parents',
      'children',
      'grandchildren',
    ]);
    const dataFiles = getInsertSQLsForTestData({ dialect: 'mssql' });
    for (const table of dataFiles) {
      const name = (table.table as any).name;
      const hasIdentity = identityTables.has(name);
      // Insert()'s column list is not passed through reserved-word
      // escaping, so `rank` (bracket-quoted in the DDL above) must be
      // quoted by hand here too.
      const scripts = table.scripts.map(s => s.replace(/\brank\b/g, '[rank]'));
      // ConnectionPool resets session state (including SET IDENTITY_INSERT)
      // between separate .request() calls, even with pool.max = 1, so ON,
      // the inserts, and OFF must all run in a single batch/request.
      const batch = hasIdentity
        ? `SET IDENTITY_INSERT ${name} ON;\n${scripts.join(';\n')};\nSET IDENTITY_INSERT ${name} OFF;`
        : scripts.join(';\n');
      await pool.request().query(batch);
    }
  } finally {
    await pool.close();
  }
}
