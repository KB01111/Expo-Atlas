-- MCP (Model Context Protocol) Integration Schema
-- This schema supports full MCP server integration and agent templates

-- MCP Servers table
CREATE TABLE IF NOT EXISTS mcp_servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    endpoint TEXT NOT NULL,
    status TEXT CHECK (status IN ('connected', 'disconnected', 'error')) DEFAULT 'disconnected',
    capabilities TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_connected TIMESTAMP WITH TIME ZONE
);

-- MCP Tools table
CREATE TABLE IF NOT EXISTS mcp_tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    server_id TEXT REFERENCES mcp_servers(id) ON DELETE CASCADE,
    parameters JSONB DEFAULT '{}',
    capabilities TEXT[] DEFAULT '{}',
    usage_cost DECIMAL(10, 6) DEFAULT 0,
    rate_limits JSONB DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MCP Connections (Agent-Server relationships)
CREATE TABLE IF NOT EXISTS mcp_connections (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    server_id TEXT REFERENCES mcp_servers(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    configuration JSONB DEFAULT '{}',
    authentication JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(server_id, agent_id)
);

-- MCP Tool Executions (Logging and analytics)
CREATE TABLE IF NOT EXISTS mcp_tool_executions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tool_id TEXT REFERENCES mcp_tools(id) ON DELETE CASCADE,
    server_id TEXT REFERENCES mcp_servers(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    parameters JSONB DEFAULT '{}',
    result JSONB,
    error TEXT,
    execution_time INTEGER, -- in milliseconds
    cost DECIMAL(10, 6) DEFAULT 0,
    status TEXT CHECK (status IN ('success', 'error')) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Templates table (Enhanced)
CREATE TABLE IF NOT EXISTS agent_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    thumbnail TEXT,
    config JSONB NOT NULL,
    tags TEXT[] DEFAULT '{}',
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'intermediate',
    estimated_setup_time INTEGER DEFAULT 30, -- in minutes
    popularity_score INTEGER DEFAULT 0,
    created_by_id TEXT NOT NULL,
    created_by_name TEXT NOT NULL,
    created_by_avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usage_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3, 2) DEFAULT 0,
    rating_total INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false
);

-- Template Usage Logs
CREATE TABLE IF NOT EXISTS template_usage_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    template_id TEXT REFERENCES agent_templates(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    deployment_type TEXT CHECK (deployment_type IN ('one_click', 'custom', 'fork')) DEFAULT 'one_click',
    agent_id TEXT, -- ID of the deployed agent
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Template Ratings
CREATE TABLE IF NOT EXISTS template_ratings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    template_id TEXT REFERENCES agent_templates(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    review TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id, user_id)
);

-- Agent Categories
CREATE TABLE IF NOT EXISTS agent_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vector Stores (for file management)
CREATE TABLE IF NOT EXISTS vector_stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_count INTEGER DEFAULT 0,
    total_size_bytes BIGINT DEFAULT 0,
    embedding_model TEXT DEFAULT 'text-embedding-3-small',
    status TEXT CHECK (status IN ('ready', 'processing', 'error')) DEFAULT 'ready',
    agents TEXT[] DEFAULT '{}', -- Array of agent IDs using this store
    metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mcp_servers_status ON mcp_servers(status);
CREATE INDEX IF NOT EXISTS idx_mcp_tools_server_id ON mcp_tools(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_connections_agent_id ON mcp_connections(agent_id);
CREATE INDEX IF NOT EXISTS idx_mcp_connections_server_id ON mcp_connections(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_executions_agent_id ON mcp_tool_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_executions_timestamp ON mcp_tool_executions(timestamp);
CREATE INDEX IF NOT EXISTS idx_agent_templates_category ON agent_templates(category);
CREATE INDEX IF NOT EXISTS idx_agent_templates_popularity ON agent_templates(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_agent_templates_rating ON agent_templates(rating_average DESC);
CREATE INDEX IF NOT EXISTS idx_template_usage_logs_template_id ON template_usage_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_logs_user_id ON template_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_template_ratings_template_id ON template_ratings(template_id);

-- Row Level Security (RLS) Policies
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_tool_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vector_stores ENABLE ROW LEVEL SECURITY;

-- MCP Servers policies (public read for discovery)
CREATE POLICY "MCP servers are viewable by everyone" ON mcp_servers FOR SELECT USING (true);
CREATE POLICY "MCP servers can be managed by authenticated users" ON mcp_servers FOR ALL USING (auth.role() = 'authenticated');

-- MCP Tools policies
CREATE POLICY "MCP tools are viewable by everyone" ON mcp_tools FOR SELECT USING (true);
CREATE POLICY "MCP tools can be managed by authenticated users" ON mcp_tools FOR ALL USING (auth.role() = 'authenticated');

-- MCP Connections policies (user-specific)
CREATE POLICY "Users can view their own MCP connections" ON mcp_connections FOR SELECT USING (auth.uid()::text = agent_id OR auth.role() = 'service_role');
CREATE POLICY "Users can manage their own MCP connections" ON mcp_connections FOR ALL USING (auth.uid()::text = agent_id OR auth.role() = 'service_role');

-- MCP Tool Executions policies (user-specific)
CREATE POLICY "Users can view their own tool executions" ON mcp_tool_executions FOR SELECT USING (auth.uid()::text = agent_id OR auth.role() = 'service_role');
CREATE POLICY "Users can create tool executions" ON mcp_tool_executions FOR INSERT WITH CHECK (auth.uid()::text = agent_id OR auth.role() = 'service_role');

-- Agent Templates policies (public templates visible to all)
CREATE POLICY "Public templates are viewable by everyone" ON agent_templates FOR SELECT USING (is_public = true OR auth.uid()::text = created_by_id);
CREATE POLICY "Users can create their own templates" ON agent_templates FOR INSERT WITH CHECK (auth.uid()::text = created_by_id);
CREATE POLICY "Users can update their own templates" ON agent_templates FOR UPDATE USING (auth.uid()::text = created_by_id);
CREATE POLICY "Users can delete their own templates" ON agent_templates FOR DELETE USING (auth.uid()::text = created_by_id);

-- Template usage logs policies
CREATE POLICY "Users can view their own usage logs" ON template_usage_logs FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "Users can create usage logs" ON template_usage_logs FOR INSERT WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- Template ratings policies
CREATE POLICY "Users can view all ratings" ON template_ratings FOR SELECT USING (true);
CREATE POLICY "Users can manage their own ratings" ON template_ratings FOR ALL USING (auth.uid()::text = user_id);

-- Vector stores policies
CREATE POLICY "Users can view vector stores" ON vector_stores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can manage vector stores" ON vector_stores FOR ALL USING (auth.role() = 'authenticated');

-- Functions for template analytics
CREATE OR REPLACE FUNCTION get_template_analytics(template_id_param TEXT DEFAULT NULL)
RETURNS TABLE (
    template_id TEXT,
    usage_count BIGINT,
    unique_users BIGINT,
    avg_rating DECIMAL,
    total_ratings BIGINT,
    recent_deployments BIGINT
) AS $$
BEGIN
    IF template_id_param IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            t.id as template_id,
            COUNT(ul.id) as usage_count,
            COUNT(DISTINCT ul.user_id) as unique_users,
            COALESCE(AVG(tr.rating), 0)::DECIMAL as avg_rating,
            COUNT(tr.rating) as total_ratings,
            COUNT(CASE WHEN ul.timestamp > NOW() - INTERVAL '30 days' THEN 1 END) as recent_deployments
        FROM agent_templates t
        LEFT JOIN template_usage_logs ul ON t.id = ul.template_id
        LEFT JOIN template_ratings tr ON t.id = tr.template_id
        WHERE t.id = template_id_param
        GROUP BY t.id;
    ELSE
        RETURN QUERY
        SELECT 
            t.id as template_id,
            COUNT(ul.id) as usage_count,
            COUNT(DISTINCT ul.user_id) as unique_users,
            COALESCE(AVG(tr.rating), 0)::DECIMAL as avg_rating,
            COUNT(tr.rating) as total_ratings,
            COUNT(CASE WHEN ul.timestamp > NOW() - INTERVAL '30 days' THEN 1 END) as recent_deployments
        FROM agent_templates t
        LEFT JOIN template_usage_logs ul ON t.id = ul.template_id
        LEFT JOIN template_ratings tr ON t.id = tr.template_id
        GROUP BY t.id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update template popularity scores
CREATE OR REPLACE FUNCTION update_template_popularity_scores()
RETURNS void AS $$
BEGIN
    UPDATE agent_templates 
    SET popularity_score = (
        COALESCE(usage_count, 0) * 10 +
        COALESCE(rating_average, 0) * 20 +
        COALESCE((
            SELECT COUNT(*)::INTEGER 
            FROM template_usage_logs 
            WHERE template_id = agent_templates.id 
            AND timestamp > NOW() - INTERVAL '30 days'
        ), 0) * 5
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default agent categories
INSERT INTO agent_categories (id, name, description, icon, color, sort_order) VALUES
    ('productivity', 'Productivity', 'Agents that boost your daily productivity', 'rocket', '#6366F1', 1),
    ('business', 'Business', 'Business automation and analytics agents', 'briefcase', '#10B981', 2),
    ('development', 'Development', 'Code generation and development assistance', 'code', '#F59E0B', 3),
    ('research', 'Research', 'Research and data analysis agents', 'search', '#EF4444', 4),
    ('creative', 'Creative', 'Content creation and creative assistance', 'brush', '#8B5CF6', 5),
    ('support', 'Customer Support', 'Customer service and support agents', 'headphones', '#06B6D4', 6)
ON CONFLICT (id) DO NOTHING;

-- Insert sample MCP servers
INSERT INTO mcp_servers (id, name, description, endpoint, status, capabilities, metadata) VALUES
    ('filesystem', 'File System', 'Access and manipulate files and directories', 'mcp://filesystem', 'disconnected', 
     ARRAY['read', 'write', 'list'], '{"version": "1.0.0", "provider": "mcp", "category": "system"}'),
    ('web_search', 'Web Search', 'Search the web and get real-time information', 'mcp://web-search', 'disconnected',
     ARRAY['search', 'browse'], '{"version": "1.0.0", "provider": "mcp", "category": "information"}'),
    ('gmail', 'Gmail Integration', 'Send and manage emails via Gmail', 'composio://gmail', 'disconnected',
     ARRAY['read', 'write', 'send'], '{"version": "1.0.0", "provider": "composio", "category": "communication"}'),
    ('googlecalendar', 'Google Calendar', 'Manage calendar events and scheduling', 'composio://googlecalendar', 'disconnected',
     ARRAY['read', 'write', 'schedule'], '{"version": "1.0.0", "provider": "composio", "category": "productivity"}'),
    ('github', 'GitHub Integration', 'Access GitHub repositories and code', 'composio://github', 'disconnected',
     ARRAY['read', 'write', 'clone', 'push'], '{"version": "1.0.0", "provider": "composio", "category": "development"}'),
    ('slack', 'Slack Integration', 'Send messages and manage Slack workspace', 'composio://slack', 'disconnected',
     ARRAY['read', 'write', 'notify'], '{"version": "1.0.0", "provider": "composio", "category": "communication"}')
ON CONFLICT (id) DO NOTHING;

-- Insert corresponding MCP tools
INSERT INTO mcp_tools (id, name, description, server_id, parameters, capabilities, usage_cost, rate_limits) VALUES
    ('read_file', 'Read File', 'Read contents of a file', 'filesystem', 
     '{"type": "object", "properties": {"path": {"type": "string", "description": "File path to read"}}, "required": ["path"]}',
     ARRAY['read'], 0.0001, '{"requests_per_minute": 100, "requests_per_day": 10000}'),
    ('write_file', 'Write File', 'Write contents to a file', 'filesystem',
     '{"type": "object", "properties": {"path": {"type": "string", "description": "File path"}, "content": {"type": "string", "description": "Content to write"}}, "required": ["path", "content"]}',
     ARRAY['write'], 0.0002, '{"requests_per_minute": 50, "requests_per_day": 5000}'),
    ('search_web', 'Search Web', 'Search the web for information', 'web_search',
     '{"type": "object", "properties": {"query": {"type": "string", "description": "Search query"}, "max_results": {"type": "number", "description": "Maximum results"}}, "required": ["query"]}',
     ARRAY['read'], 0.005, '{"requests_per_minute": 20, "requests_per_day": 1000}'),
    ('send_email', 'Send Email', 'Send an email via Gmail', 'gmail',
     '{"type": "object", "properties": {"to": {"type": "string", "description": "Recipient email"}, "subject": {"type": "string", "description": "Email subject"}, "body": {"type": "string", "description": "Email body"}}, "required": ["to", "subject", "body"]}',
     ARRAY['write'], 0.001, '{"requests_per_minute": 30, "requests_per_day": 500}'),
    ('create_event', 'Create Calendar Event', 'Create a new calendar event', 'googlecalendar',
     '{"type": "object", "properties": {"title": {"type": "string", "description": "Event title"}, "start_time": {"type": "string", "description": "Start time"}, "end_time": {"type": "string", "description": "End time"}}, "required": ["title", "start_time", "end_time"]}',
     ARRAY['write'], 0.002, '{"requests_per_minute": 20, "requests_per_day": 200}')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE mcp_servers IS 'MCP (Model Context Protocol) servers that provide tools and capabilities';
COMMENT ON TABLE mcp_tools IS 'Individual tools provided by MCP servers';
COMMENT ON TABLE mcp_connections IS 'Agent-to-MCP server connections and configurations';
COMMENT ON TABLE mcp_tool_executions IS 'Log of MCP tool executions for analytics and debugging';
COMMENT ON TABLE agent_templates IS 'Pre-built agent templates for quick deployment';
COMMENT ON TABLE template_usage_logs IS 'Usage analytics for agent templates';
COMMENT ON TABLE template_ratings IS 'User ratings and reviews for agent templates';
COMMENT ON TABLE vector_stores IS 'Vector stores for agent knowledge bases';