-- Спринты
CREATE TABLE IF NOT EXISTS sprints (
  id             SERIAL PRIMARY KEY,
  number         INT NOT NULL,
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  confluence_url TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Эпики спринта (QA-специфика)
CREATE TABLE IF NOT EXISTS sprint_epics (
  id           SERIAL PRIMARY KEY,
  sprint_id    INT NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  jira_key     TEXT NOT NULL,
  team         TEXT NOT NULL CHECK (team IN ('CORE', 'eQA')),
  priority     TEXT NOT NULL DEFAULT 'none' CHECK (priority IN ('highest', 'high', 'none')),
  goal         TEXT,
  critbusiness BOOLEAN NOT NULL DEFAULT false,
  bonus        BOOLEAN NOT NULL DEFAULT false,
  task         BOOLEAN NOT NULL DEFAULT false,
  goal_done    BOOLEAN NOT NULL DEFAULT false,
  sort_order   INT NOT NULL DEFAULT 0,
  UNIQUE (sprint_id, jira_key)
);

-- Участники
CREATE TABLE IF NOT EXISTS members (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slack_id    TEXT,
  team        TEXT NOT NULL CHECK (team IN ('CORE', 'eQA')),
  role        TEXT,
  on_vacation BOOLEAN NOT NULL DEFAULT false,
  shift       TEXT
);

-- Назначения
CREATE TABLE IF NOT EXISTS assignments (
  id        SERIAL PRIMARY KEY,
  sprint_id INT NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  jira_key  TEXT NOT NULL,
  note      TEXT,
  UNIQUE (sprint_id, member_id, jira_key)
);

-- Прогресс firstPass
CREATE TABLE IF NOT EXISTS progress_entries (
  id         SERIAL PRIMARY KEY,
  sprint_id  INT NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  jira_key   TEXT NOT NULL,
  first_pass INT NOT NULL DEFAULT 0 CHECK (first_pass >= 0 AND first_pass <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  UNIQUE (sprint_id, jira_key)
);

-- Кэш Jira
CREATE TABLE IF NOT EXISTS jira_cache (
  jira_key      TEXT PRIMARY KEY,
  title         TEXT,
  jira_status   TEXT,
  assignee_name TEXT,
  assignee_id   TEXT,
  priority      TEXT,
  retest_pct    INT NOT NULL DEFAULT 0 CHECK (retest_pct >= 0 AND retest_pct <= 100),
  synced_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
