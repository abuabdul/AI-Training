import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";
dotenv.config();

const client = new Anthropic();
const MODEL = "claude-haiku-4-5-20251001";

// --- Tool definitions (spec gives you one; write the second yourself) ---

const getWeather: Anthropic.Tool = {
  name: "get_weather",
  description: "Get current weather for a location",
  input_schema: {
    type: "object",
    properties: { location: { type: "string" } },
    required: ["location"],
  },
};

// TODO: define convertTemperature tool here

const tools: Anthropic.Tool[] = [getWeather /*, convertTemperature */];

// --- Tool implementations (yours to write) ---

function executeTool(name: string, input: Record<string, unknown>): string {
  // TODO: dispatch to get_weather or convert_temperature
  throw new Error(`Unknown tool: ${name}`);
}

// --- The loop (entirely yours — this is the exercise) ---

async function runAgent(userPrompt: string): Promise<void> {
  // TODO: build the message list, call the API, handle tool_use, loop until end_turn
}

// Entry point
runAgent(
  "What's the weather in Paris, and what's that temperature in Fahrenheit?"
).catch(console.error);
