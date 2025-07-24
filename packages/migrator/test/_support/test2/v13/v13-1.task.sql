CREATE TABLE $(schema).table3
(
    id integer NOT NULL,
    name varchar(256),
    active boolean default true,
    CONSTRAINT table3_pkey PRIMARY KEY (id)
) TABLESPACE $(tablespace);

ALTER TABLE $(schema).table3 OWNER to $(owner);
