// Nebius Token Factory model for the coordinator bot and the outcome classifier. Override with NEBIUS_MODEL.
// Not openai/gpt-oss-120b: on Nebius its streamed tool calls break the AI SDK ("Expected 'function.name' to be a string").
export const NEBIUS_MODEL = process.env.NEBIUS_MODEL || "deepseek-ai/DeepSeek-V4-Flash-0731";
