# Roadmap and Future Scope

This file tracks items intentionally left as future work so the prototype stays lean but extensible.

## Near-Term Enhancements

- Replace mock ML scoring with a real model endpoint and model registry tracking.
- Integrate a real watchlist provider (OFAC, internal fraud DB, device fingerprint vendor).
- Add a feature store pipeline that backfills historical features nightly.
- Persist deep analysis results from the worker into PostgreSQL.

## Communication and Case Management

- WhatsApp fraud alerts via WhatsApp Business API or Twilio.
- Analyst case workflow UI with escalation tracking and SLA timers.
- Dispute intake API with attachments and evidence capture.

## LLM and Agentic AI Capabilities

- LLM-based dispute resolution agent with conversation state + audit logs.
- Automated investigation agent that runs enrichment tools and summarizes findings.
- Human-in-the-loop feedback loop to improve model quality.

## Platform & Scale

- Swap BullMQ for Kafka/SQS for higher throughput.
- Add OpenTelemetry tracing + centralized logs.
- Implement multi-tenant configuration for thresholds and watchlists.
