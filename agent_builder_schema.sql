-- =========================================
-- OPENAI AGENT BUILDER COMPREHENSIVE SCHEMA
-- =========================================

-- Agent Builder States table
CREATE TABLE IF NOT EXISTS agent_builder_states (
    id TEXT PRIMARY KEY,
    config JSONB NOT NULL,
    validation JSONB NOT NULL DEFAULT '{"step_errors": {}, "warnings": [], "is_valid": false}',
    preview JSONB NOT NULL DEFAULT '{"test_conversations": []}',
    deployment JSONB NOT NULL DEFAULT '{"status": "draft"}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Files table for file management
CREATE TABLE IF NOT EXISTS agent_files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('knowledge', 'code', 'image', 'document')),
    size_bytes INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    content TEXT,
    url TEXT,
    openai_file_id TEXT,
    vector_store_id TEXT,
    processing_status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom Functions table
CREATE TABLE IF NOT EXISTS custom_functions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    parameters JSONB NOT NULL,
    implementation JSONB NOT NULL,
    test_cases JSONB NOT NULL DEFAULT '[]',
    enabled BOOLEAN NOT NULL DEFAULT true,
    agent_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Test Conversations table
CREATE TABLE IF NOT EXISTS agent_test_conversations (
    id TEXT PRIMARY KEY,
    builder_id TEXT NOT NULL,
    name TEXT NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]',
    metrics JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'running' 
        CHECK (status IN ('running', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (builder_id) REFERENCES agent_builder_states(id) ON DELETE CASCADE
);

-- Agent Templates table
CREATE TABLE IF NOT EXISTS agent_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    thumbnail TEXT,
    config JSONB NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    difficulty TEXT NOT NULL DEFAULT 'intermediate' 
        CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_setup_time INTEGER NOT NULL DEFAULT 30,
    popularity_score DECIMAL NOT NULL DEFAULT 0,
    created_by JSONB NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT false,
    usage_count INTEGER NOT NULL DEFAULT 0,
    rating JSONB NOT NULL DEFAULT '{"average": 0, "total_ratings": 0}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Deployments table
CREATE TABLE IF NOT EXISTS agent_deployments (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    environment TEXT NOT NULL DEFAULT 'production' 
        CHECK (environment IN ('development', 'staging', 'production')),
    version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'inactive', 'deprecated')),
    endpoints JSONB NOT NULL,
    configuration JSONB NOT NULL DEFAULT '{}',
    metrics JSONB NOT NULL DEFAULT '{}',
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deployed_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Vector Stores table (enhanced)
CREATE TABLE IF NOT EXISTS vector_stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    file_count INTEGER NOT NULL DEFAULT 0,
    total_size_bytes BIGINT NOT NULL DEFAULT 0,
    embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    status TEXT NOT NULL DEFAULT 'ready' 
        CHECK (status IN ('creating', 'ready', 'failed', 'deleting')),
    agents TEXT[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function Executions table for testing
CREATE TABLE IF NOT EXISTS function_executions (
    id TEXT PRIMARY KEY,
    function_id TEXT NOT NULL,
    input JSONB NOT NULL,
    output JSONB,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    execution_time_ms INTEGER NOT NULL,
    executed_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (function_id) REFERENCES custom_functions(id) ON DELETE CASCADE
);

-- Agent Performance Metrics table
CREATE TABLE IF NOT EXISTS agent_performance_metrics (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    date DATE NOT NULL,
    total_executions INTEGER NOT NULL DEFAULT 0,
    successful_executions INTEGER NOT NULL DEFAULT 0,
    failed_executions INTEGER NOT NULL DEFAULT 0,
    average_response_time_ms DECIMAL NOT NULL DEFAULT 0,
    total_tokens_used INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL NOT NULL DEFAULT 0,
    success_rate DECIMAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    UNIQUE(agent_id, date)
);

-- Agent Builder Sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS agent_builder_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    builder_id TEXT NOT NULL,
    session_data JSONB NOT NULL DEFAULT '{}',
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (builder_id) REFERENCES agent_builder_states(id) ON DELETE CASCADE
);

-- Agent Collaboration table for team building
CREATE TABLE IF NOT EXISTS agent_collaborations (
    id TEXT PRIMARY KEY,
    primary_agent_id TEXT NOT NULL,
    collaborator_agent_id TEXT NOT NULL,
    collaboration_type TEXT NOT NULL 
        CHECK (collaboration_type IN ('workflow', 'handoff', 'parallel', 'supervisor')),
    configuration JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'inactive', 'paused')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (primary_agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (collaborator_agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    UNIQUE(primary_agent_id, collaborator_agent_id, collaboration_type)
);

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================

-- Agent builder state indexes
CREATE INDEX IF NOT EXISTS idx_agent_builder_states_updated_at ON agent_builder_states(updated_at);
CREATE INDEX IF NOT EXISTS idx_agent_builder_states_config_step ON agent_builder_states USING GIN ((config->>'step'));

-- Agent files indexes
CREATE INDEX IF NOT EXISTS idx_agent_files_type ON agent_files(type);
CREATE INDEX IF NOT EXISTS idx_agent_files_processing_status ON agent_files(processing_status);
CREATE INDEX IF NOT EXISTS idx_agent_files_openai_file_id ON agent_files(openai_file_id);
CREATE INDEX IF NOT EXISTS idx_agent_files_vector_store_id ON agent_files(vector_store_id);

-- Custom functions indexes
CREATE INDEX IF NOT EXISTS idx_custom_functions_name ON custom_functions(name);
CREATE INDEX IF NOT EXISTS idx_custom_functions_enabled ON custom_functions(enabled);
CREATE INDEX IF NOT EXISTS idx_custom_functions_agent_id ON custom_functions(agent_id);

-- Test conversations indexes
CREATE INDEX IF NOT EXISTS idx_agent_test_conversations_builder_id ON agent_test_conversations(builder_id);
CREATE INDEX IF NOT EXISTS idx_agent_test_conversations_status ON agent_test_conversations(status);
CREATE INDEX IF NOT EXISTS idx_agent_test_conversations_created_at ON agent_test_conversations(created_at);

-- Templates indexes
CREATE INDEX IF NOT EXISTS idx_agent_templates_category ON agent_templates(category);
CREATE INDEX IF NOT EXISTS idx_agent_templates_public ON agent_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_agent_templates_popularity ON agent_templates(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_agent_templates_tags ON agent_templates USING GIN (tags);

-- Deployments indexes
CREATE INDEX IF NOT EXISTS idx_agent_deployments_agent_id ON agent_deployments(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_deployments_environment ON agent_deployments(environment);
CREATE INDEX IF NOT EXISTS idx_agent_deployments_status ON agent_deployments(status);
CREATE INDEX IF NOT EXISTS idx_agent_deployments_deployed_at ON agent_deployments(deployed_at);

-- Vector stores indexes
CREATE INDEX IF NOT EXISTS idx_vector_stores_status ON vector_stores(status);
CREATE INDEX IF NOT EXISTS idx_vector_stores_agents ON vector_stores USING GIN (agents);

-- Performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_agent_id ON agent_performance_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_date ON agent_performance_metrics(date);
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_agent_date ON agent_performance_metrics(agent_id, date);

-- Function executions indexes
CREATE INDEX IF NOT EXISTS idx_function_executions_function_id ON function_executions(function_id);
CREATE INDEX IF NOT EXISTS idx_function_executions_success ON function_executions(success);
CREATE INDEX IF NOT EXISTS idx_function_executions_created_at ON function_executions(created_at);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_agent_builder_sessions_user_id ON agent_builder_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_builder_sessions_builder_id ON agent_builder_sessions(builder_id);
CREATE INDEX IF NOT EXISTS idx_agent_builder_sessions_last_activity ON agent_builder_sessions(last_activity);

-- =========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =========================================

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_agent_builder_states_updated_at 
    BEFORE UPDATE ON agent_builder_states 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_files_updated_at 
    BEFORE UPDATE ON agent_files 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_functions_updated_at 
    BEFORE UPDATE ON custom_functions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_test_conversations_updated_at 
    BEFORE UPDATE ON agent_test_conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_templates_updated_at 
    BEFORE UPDATE ON agent_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_deployments_updated_at 
    BEFORE UPDATE ON agent_deployments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vector_stores_updated_at 
    BEFORE UPDATE ON vector_stores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_performance_metrics_updated_at 
    BEFORE UPDATE ON agent_performance_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_collaborations_updated_at 
    BEFORE UPDATE ON agent_collaborations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- SAMPLE DATA FOR TEMPLATES
-- =========================================

-- Insert sample agent templates
INSERT INTO agent_templates (
    id, 
    name, 
    description, 
    category, 
    config, 
    tags, 
    difficulty, 
    estimated_setup_time,
    created_by,
    is_public
) VALUES 
(
    'template_assistant_basic',
    'Basic AI Assistant',
    'A general-purpose AI assistant for answering questions and helping with tasks',
    'assistant',
    '{"basic": {"name": "AI Assistant", "description": "A helpful AI assistant", "model": "gpt-4o", "category": "assistant", "tags": ["general", "helpful"]}, "instructions": {"system_prompt": "You are a helpful AI assistant. Be friendly, informative, and concise in your responses.", "personality": "Professional yet friendly", "goals": ["Help users with their questions", "Provide accurate information", "Be concise and clear"], "constraints": ["Do not provide harmful information", "Stay within ethical guidelines"], "examples": []}, "tools": {"code_interpreter": false, "file_search": false, "functions": []}, "files": {"knowledge_files": [], "code_files": [], "vector_store_ids": []}, "advanced": {"temperature": 0.7, "top_p": 1.0, "max_tokens": 4096, "timeout_seconds": 60, "max_retries": 3, "fallback_behavior": "error"}}',
    ARRAY['assistant', 'general', 'beginner'],
    'beginner',
    15,
    '{"id": "system", "name": "System"}',
    true
),
(
    'template_coder_python',
    'Python Coding Assistant',
    'Specialized assistant for Python programming, debugging, and code review',
    'coder',
    '{"basic": {"name": "Python Coder", "description": "Expert Python programming assistant", "model": "gpt-4o", "category": "coder", "tags": ["python", "coding", "debugging"]}, "instructions": {"system_prompt": "You are an expert Python programmer. Help users write clean, efficient, and well-documented Python code. Provide explanations for your solutions and suggest best practices.", "personality": "Technical and thorough", "goals": ["Write high-quality Python code", "Explain programming concepts clearly", "Suggest best practices"], "constraints": ["Follow PEP 8 style guidelines", "Include proper error handling", "Add docstrings to functions"], "examples": []}, "tools": {"code_interpreter": true, "file_search": false, "functions": []}, "files": {"knowledge_files": [], "code_files": [], "vector_store_ids": []}, "advanced": {"temperature": 0.3, "top_p": 0.9, "max_tokens": 8192, "timeout_seconds": 90, "max_retries": 3, "fallback_behavior": "error"}}',
    ARRAY['python', 'coding', 'programming'],
    'intermediate',
    20,
    '{"id": "system", "name": "System"}',
    true
),
(
    'template_researcher_academic',
    'Academic Research Assistant',
    'Research assistant for academic writing, literature review, and citation management',
    'researcher',
    '{"basic": {"name": "Research Assistant", "description": "Academic research and writing assistant", "model": "gpt-4o", "category": "researcher", "tags": ["research", "academic", "writing"]}, "instructions": {"system_prompt": "You are an academic research assistant. Help users with literature reviews, research methodology, citation formatting, and academic writing. Maintain high standards for accuracy and scholarly rigor.", "personality": "Scholarly and methodical", "goals": ["Assist with literature reviews", "Help format citations properly", "Improve academic writing quality"], "constraints": ["Ensure factual accuracy", "Use proper academic tone", "Cite sources when available"], "examples": []}, "tools": {"code_interpreter": false, "file_search": true, "functions": []}, "files": {"knowledge_files": [], "code_files": [], "vector_store_ids": []}, "advanced": {"temperature": 0.4, "top_p": 0.8, "max_tokens": 6144, "timeout_seconds": 120, "max_retries": 3, "fallback_behavior": "error"}}',
    ARRAY['research', 'academic', 'writing'],
    'advanced',
    30,
    '{"id": "system", "name": "System"}',
    true
);

-- =========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================

-- Enable RLS on all tables
ALTER TABLE agent_builder_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_test_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vector_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE function_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_builder_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_collaborations ENABLE ROW LEVEL SECURITY;

-- Public templates policy (anyone can read public templates)
CREATE POLICY "Public templates are viewable by everyone" ON agent_templates
    FOR SELECT USING (is_public = true);

-- User-specific policies (users can only access their own data)
-- Note: These policies assume you have a user authentication system
-- You may need to adjust based on your auth implementation

-- =========================================
-- VIEWS FOR ANALYTICS
-- =========================================

-- Agent builder analytics view
CREATE OR REPLACE VIEW agent_builder_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_builders_created,
    COUNT(CASE WHEN config->>'step' = 'deploy' THEN 1 END) as completed_builders,
    COUNT(CASE WHEN deployment->>'status' = 'deployed' THEN 1 END) as deployed_agents,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_build_time_minutes
FROM agent_builder_states
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Template usage analytics view
CREATE OR REPLACE VIEW template_usage_analytics AS
SELECT 
    t.id,
    t.name,
    t.category,
    t.usage_count,
    t.rating->>'average' as average_rating,
    t.rating->>'total_ratings' as total_ratings,
    COUNT(abs.id) as active_builders
FROM agent_templates t
LEFT JOIN agent_builder_states abs ON abs.config->>'template_id' = t.id
GROUP BY t.id, t.name, t.category, t.usage_count, t.rating
ORDER BY t.usage_count DESC;

-- =========================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =========================================

-- Function to calculate agent performance metrics
CREATE OR REPLACE FUNCTION calculate_agent_performance(agent_id_param TEXT, date_param DATE)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'agent_id', agent_id_param,
        'date', date_param,
        'total_executions', COALESCE(SUM(CASE WHEN status IN ('completed', 'failed') THEN 1 ELSE 0 END), 0),
        'successful_executions', COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0),
        'failed_executions', COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0),
        'average_response_time_ms', COALESCE(AVG(EXTRACT(EPOCH FROM (endTime::timestamp - startTime::timestamp)) * 1000), 0),
        'total_tokens_used', COALESCE(SUM(tokensUsed), 0),
        'total_cost', COALESCE(SUM(cost), 0),
        'success_rate', CASE 
            WHEN SUM(CASE WHEN status IN ('completed', 'failed') THEN 1 ELSE 0 END) > 0 
            THEN ROUND((SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::DECIMAL / SUM(CASE WHEN status IN ('completed', 'failed') THEN 1 ELSE 0 END)) * 100, 2)
            ELSE 0 
        END
    ) INTO result
    FROM executions 
    WHERE agentId = agent_id_param 
    AND DATE(startTime::timestamp) = date_param;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;