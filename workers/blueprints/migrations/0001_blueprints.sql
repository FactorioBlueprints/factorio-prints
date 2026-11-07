CREATE TABLE blueprints
(
	id                 TEXT PRIMARY KEY,
	title              TEXT,
	author_id          TEXT,
	created_date       INTEGER,
	last_updated_date  INTEGER NOT NULL,
	number_of_favorites INTEGER NOT NULL DEFAULT 0,
	has_string         INTEGER NOT NULL DEFAULT 0,
	record             TEXT NOT NULL
);

CREATE INDEX blueprints_last_updated_date ON blueprints (last_updated_date DESC);
CREATE INDEX blueprints_number_of_favorites ON blueprints (number_of_favorites DESC);
CREATE INDEX blueprints_author_id ON blueprints (author_id);
