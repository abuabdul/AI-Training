# Week 1 — Hand-rolled tool-use loop

**Goal:** a TS script where Claude can call two tools you define, chain them across
multiple iterations, and stop on its own. No LangChain. No `toolRunner`.

> There is a helper, `client.beta.messages.toolRunner()`, that runs this whole loop for
> you. **Do not use it this week.** It hides the exact mechanism you're here to internalise.
> Build the loop by hand first.

## Setup
Already scaffolded in this repo. Just:
```
npm install
# put your key in .env  (cp .env.example .env)
npx tsx src/agent.ts
```
Model: `claude-haiku-4-5-20251001` — cheapest for iterating.

## The two tools (deliberately chainable)
- `get_weather(location)` → return a hardcoded string, e.g. `"Paris: 18°C, cloudy"`. No
  real API.
- `convert_temperature(celsius, to_unit)` → do the math, return the converted value.

Then prompt: **"What's the weather in Paris, and what's that temperature in Fahrenheit?"**
This forces `get_weather` first, **then** `convert_temperature` using the result — so the
loop has to turn at least twice. That's the point: you'll *see* why a single API call
can't do this.

## API shapes you'll need (the fiddly bits — the loop itself is yours)

Tool definition:
```ts
const getWeather = {
  name: "get_weather",
  description: "Get current weather for a location",
  input_schema: {
    type: "object",
    properties: { location: { type: "string" } },
    required: ["location"],
  },
};
```

The response: `message.content` is an array of blocks, each with a `type` — `"text"` or
`"tool_use"`. A `tool_use` block carries `{ id, name, input }`. When Claude wants a tool,
`message.stop_reason === "tool_use"`; when it's done, `"end_turn"`.

Returning a result — the part people get wrong: append **two** messages before calling
again. First the assistant's turn (its full `content` array, tool_use block included),
then a user turn carrying the result:
```ts
{ role: "user", content: [
  { type: "tool_result", tool_use_id: block.id, content: "Paris: 18°C, cloudy" }
]}
```

## Your algorithm
1. Start `messages` with the user prompt.
2. Call `client.messages.create({ model, max_tokens: 1024, tools, messages })`.
3. If `stop_reason === "tool_use"`: for **every** tool_use block, run the matching tool,
   collect results, append the assistant turn + a user turn with all the tool_results,
   then loop back to step 2.
4. If `stop_reason === "end_turn"`: print the final text block and stop.
5. Wrap the loop with a hard cap — bail after ~10 iterations.

## Two requirements added on purpose (production instincts)
- `console.log` each iteration: number, which tools fired, with what input. Your first
  taste of observability — watch the loop turn.
- The iteration cap in step 5 is not optional. Never trust a non-deterministic loop to
  terminate itself. While building, ask: under what prompt would this run forever?

## Reflection questions (the actual lesson — answer these for review)
1. Why does the assistant turn have to be appended *before* the tool_result?
2. What happens if Claude returns two tool_use blocks in one response and you only handle
   the first?
3. Where exactly is the non-determinism in this system?

Write the loop yourself — the struggle is where it sticks. If pure SDK mechanics block you
for more than ~20 minutes, ask for that specific unblock, not the loop.
