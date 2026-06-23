import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";
dotenv.config();

const client = new Anthropic();
const MODEL = "claude-haiku-4-5-20251001";

// ─── Tool definitions ────────────────────────────────────────────────────────
//
// A "tool" is just a JSON schema that tells Claude what functions exist and
// what arguments they accept. Claude never calls them directly — it asks YOU
// to call them by emitting a tool_use block. You run the function, hand back
// the result, and Claude continues. Think of it like an RPC contract.

const getWeather: Anthropic.Tool = {
  name: "get_weather",
  description: "Get current weather for a location",
  input_schema: {
    type: "object",
    properties: {
      location: { type: "string", description: "City name, e.g. Paris" },
    },
    required: ["location"],
  },
};

// This tool is what forces a second loop turn. Claude can't convert the
// temperature until it has called get_weather first and seen the result —
// that dependency is what makes this genuinely agentic rather than a
// single-shot prompt.
const convertTemperature: Anthropic.Tool = {
  name: "convert_temperature",
  description: "Convert a temperature value between Celsius and Fahrenheit",
  input_schema: {
    type: "object",
    properties: {
      celsius: { type: "number", description: "Temperature in Celsius" },
      to_unit: {
        type: "string",
        enum: ["fahrenheit", "celsius"],
        description: "Target unit",
      },
    },
    required: ["celsius", "to_unit"],
  },
};

// The tools array is passed to every API call so Claude always knows what's
// available. Order doesn't matter; Claude picks by name + description.
const tools: Anthropic.Tool[] = [getWeather, convertTemperature];

// ─── Tool implementations ─────────────────────────────────────────────────────
//
// These are the actual functions that run on YOUR side when Claude requests them.
// In a real system these would hit external APIs, databases, etc.
// Here they're hardcoded so you can focus on the loop mechanics, not I/O.

function getWeatherImpl(location: string): string {
  // Hardcoded — no real API. The value "18" is intentional: it feeds directly
  // into convert_temperature on the next turn.
  const data: Record<string, string> = {
    paris: "Paris: 18°C, cloudy",
    london: "London: 12°C, rainy",
    tokyo: "Tokyo: 25°C, sunny",
  };
  return data[location.toLowerCase()] ?? `${location}: 20°C, clear`;
}

function convertTemperatureImpl(celsius: number, toUnit: string): string {
  if (toUnit === "fahrenheit") {
    const f = (celsius * 9) / 5 + 32;
    return `${celsius}°C = ${f.toFixed(1)}°F`;
  }
  return `${celsius}°C (already in Celsius)`;
}

// Single dispatch point. Every tool_use block from Claude comes here.
// Keeping dispatch in one place makes it easy to add logging, error handling,
// or timeouts later — a production instinct worth ingraining now.
function executeTool(name: string, input: Record<string, unknown>): string {
  if (name === "get_weather") {
    return getWeatherImpl(input.location as string);
  }
  if (name === "convert_temperature") {
    return convertTemperatureImpl(
      input.celsius as number,
      input.to_unit as string
    );
  }
  throw new Error(`Unknown tool: ${name}`);
}

// ─── The agent loop ───────────────────────────────────────────────────────────
//
// This is the core of agentic AI. It's a while-loop around an API call, but
// what makes it "agentic" is that Claude decides — on each turn — whether to
// call a tool or produce a final answer. You don't control the path; you just
// respond to what Claude asks for and keep going until it says it's done.
//
// Mental model from distributed systems: think of it as a coroutine. Claude
// yields control to you whenever it needs external data (tool_use), and you
// resume it by appending the result and calling the API again.

async function runAgent(userPrompt: string): Promise<void> {
  // The message list is the entire shared state of the conversation.
  // Every turn — both what Claude says and what you reply — gets appended here.
  // This is how Claude has "memory": it re-reads the full history on every call.
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ];

  const MAX_ITERATIONS = 10; // Hard cap — never trust a non-deterministic loop
  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools,
      messages,
    });

    // Observability: log every turn so you can watch the loop turn in real time.
    // In production this becomes a trace span. Here it's console.log.
    const toolNames = response.content
      .filter((b) => b.type === "tool_use")
      .map((b) => (b as Anthropic.ToolUseBlock).name);

    console.log(
      `[iter ${iteration}] stop_reason=${response.stop_reason}`,
      toolNames.length ? `tools=${toolNames.join(", ")}` : "no tools"
    );

    // ── Terminal condition ────────────────────────────────────────────────────
    // "end_turn" means Claude is satisfied — it has enough information to
    // answer and isn't asking for another tool. Extract and print the text.
    if (response.stop_reason === "end_turn") {
      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as Anthropic.TextBlock).text)
        .join("\n");
      console.log("\nFinal answer:\n", text);
      return;
    }

    // ── Tool execution ────────────────────────────────────────────────────────
    // "tool_use" means Claude wants one or more tools run. There may be
    // multiple tool_use blocks in a single response — handle ALL of them.
    // If you only handle the first, Claude gets a partial picture and may
    // produce a wrong or confused answer on the next turn.
    if (response.stop_reason === "tool_use") {
      // Step A: append the assistant's full response to the message list.
      // This is required BEFORE the tool results. The protocol demands that
      // the assistant turn comes first — tool_results must immediately follow
      // the assistant message that requested them, or the API rejects it.
      messages.push({ role: "assistant", content: response.content });

      // Step B: run every tool that was requested and collect the results.
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        const result = executeTool(
          block.name,
          block.input as Record<string, unknown>
        );

        console.log(`  → ${block.name}(${JSON.stringify(block.input)}) = ${result}`);

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id, // Must match the id from the tool_use block
          content: result,
        });
      }

      // Step C: append all results as a single user turn, then loop back.
      // They go in one message (not separate messages) because they all belong
      // to the same assistant turn that requested them.
      messages.push({ role: "user", content: toolResults });

      continue; // back to top → next API call
    }

    // Unexpected stop reason — bail cleanly rather than looping forever.
    console.log("Unexpected stop_reason:", response.stop_reason);
    break;
  }

  if (iteration >= MAX_ITERATIONS) {
    console.error("Hit iteration cap — loop did not terminate naturally.");
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────
runAgent(
  "What's the weather in Paris, and what's that temperature in Fahrenheit?"
).catch(console.error);
