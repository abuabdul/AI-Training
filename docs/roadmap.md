# Roadmap — 8 weeks to production-credible agentic AI

~5–8 focused hours/week. The aim is not breadth; it's one real agentic RAG system built
end to end with evaluation, observability, and defensible judgment about tradeoffs. We go
narrow and deep. One project carried the whole way, deepened each phase — each phase ends
in a number you can move and something the mentor reviews.

> Note: this is the plan, not a contract. It will shift as the work reveals what's hard.
> The mentor should adapt sequencing to where the real friction shows up.

## Week 1 — the raw agent loop, no framework
Build a ~30-line Claude tool-use loop by hand: message list, tool definitions, the
call→tool→observe loop, stop conditions, an iteration cap. No LangChain, no toolRunner.
Concept: what makes something an agent vs. a plain workflow — and why you prefer the
workflow whenever you can. Spec: `week-01-agent-loop.md`.

## Weeks 2–3 — RAG properly, evaluation FIRST
Build a retrieval pipeline on Claude. Before tuning anything, write a small eval set
(20–30 domain Q/A pairs) and a scorer. You don't optimise a number you haven't defined.
Concept: chunking, embeddings, retrieval quality. (Flag here whether RAGAS-in-Python earns
its place or a TS-native eval is enough.) Output: a quality score you can deliberately move.

## Weeks 4–5 — LangGraph + a Reflection agent
Now that the raw loop is understood, introduce LangGraph (JS/TS) as the abstraction over
it. Add a critique-and-revise node; measure whether the eval score actually improves and
what it costs in latency and tokens. Reflection isn't free — learn when it earns its place.

## Weeks 6–7 — Supervisor + observability
Add tracing (LangSmith). Add a supervisor routing to two specialists. Concept:
orchestration patterns mapped to the distributed-systems topologies already known;
debugging non-determinism through traces; holding a cost/latency budget.

## Week 8 — hardening + system design
Guardrails, fallbacks, failure modes, caching, and a written "when NOT to use an agent"
position. Then a live design drill on an agentic feature in a realistic domain, run like a
senior design interview.

## Cadence
One focused session/week. He brings the artifact — code, a trace, an eval delta, a design
call he's unsure about. The mentor reviews, pushes back, sets the next increment. Between
sessions he builds; the review is where the senior judgment gets installed.
