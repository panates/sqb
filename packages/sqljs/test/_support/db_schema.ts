export const sql = `

CREATE TABLE continents
(
    code text PRIMARY KEY,
    name text   
);

CREATE TABLE countries
(
    code text PRIMARY KEY,
    name text,
    phone_code text,
    continent_code text,
    has_market integer default 1,
    FOREIGN KEY (continent_code) REFERENCES continents (code)
);

CREATE TABLE customers
(
    id INTEGER PRIMARY KEY,
    given_name text,
    family_name text,
    birth_date date,
    gender text,
    city text,
    country_code text,
    active INTEGER default 1,
    vip integer,
    address_city text,
    address_street text,
    address_zip_code text,
    custom_data text,
    created_at text,
    updated_at text,
    FOREIGN KEY (country_code) REFERENCES countries (code)
);

CREATE TABLE customer_details
(
  customer_id INTEGER PRIMARY KEY,
  notes text,
  alerts text,
  FOREIGN KEY (customer_id) REFERENCES customers (id)
);

CREATE TABLE customer_vip_details
(
  customer_id INTEGER PRIMARY KEY,
  notes text,
  rank integer default 0,
  FOREIGN KEY (customer_id) REFERENCES customers (id)
);

CREATE TABLE tags
(
    id INTEGER,
    name text,
    color text,
    active integer,
    PRIMARY KEY (id)
);

CREATE TABLE customer_tags
(
    customer_id INTEGER,
    tag_id INTEGER,
    deleted INTEGER default 0,
    PRIMARY KEY (customer_id, tag_id)
);

`;
