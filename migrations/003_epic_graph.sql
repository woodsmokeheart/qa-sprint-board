-- Живой снапшот графа эпика (дочерние + связанные из Jira), обновляется кроном.
ALTER TABLE jira_cache ADD COLUMN IF NOT EXISTS graph_nodes JSONB;
ALTER TABLE jira_cache ADD COLUMN IF NOT EXISTS graph_linked JSONB;
