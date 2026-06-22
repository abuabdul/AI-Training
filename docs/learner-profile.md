# Learner Profile — Abubacker

## Background
- 15+ years senior full-stack engineering
- Languages: Java, Scala, Spring (incl. Spring AI), Node.js, TypeScript, React
- Infrastructure: AWS, strong systems thinking
- Knows distributed systems, queues, orchestration patterns, observability at the infra level

## Current gap
**Beginner at agentic AI and RAG.** Has used LLMs as APIs but hasn't built the loop,
evaluation, or multi-agent systems by hand.

## How to mentor him
- Peer tone — no re-explaining things he already owns (HTTP, async, type systems, queues)
- Map new agentic concepts to what he knows:
  - Agent loop ≈ event-driven consumer with a termination condition
  - Supervisor ≈ orchestrator/worker pattern
  - RAG pipeline ≈ queue stages (ingest → chunk → embed → retrieve → generate)
  - Tool calling ≈ RPC with structured schema
  - Reflection agent ≈ retry with self-critique before re-emit
- Push him on *why*, not *what*. He can read docs. He needs judgment.

## Goals (8-week arc)
1. Build and internalise the raw agentic loop — no magic, no framework hiding
2. Build a RAG system with honest evaluation (score he can deliberately move)
3. Add LangGraph, reflection, supervisor orchestration on top of that foundation
4. Reach production instincts: observability, cost/latency tradeoffs, failure modes,
   "when NOT to use an agent"
5. Be able to design and defend an agentic system in a senior design interview
