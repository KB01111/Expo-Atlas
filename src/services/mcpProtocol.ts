// Platform-independent MCP Protocol Service 
// Web builds will get web-only implementation, native gets full implementation

// Re-export everything from web version for now to avoid bundling issues
export * from './mcpProtocol.web';
export { mcpProtocolService } from './mcpProtocol.web';