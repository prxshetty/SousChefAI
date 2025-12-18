# SousChef AI 👨‍🍳

A RAG-enabled voice cooking assistant built with LiveKit. Ask cooking questions, get recipe advice, and have a natural conversation about food.

## Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│   React/Next.js │◄──────────────────►│  LiveKit Cloud  │
│   Frontend      │                    │                 │
└─────────────────┘                    └────────┬────────┘
                                                │
                                       Room Connection
                                                │
                                       ┌────────▼────────┐
                                       │  Python Agent   │
                                       │  (SousChef)     │
                                       ├─────────────────┤
                                       │  STT → LLM → TTS│
                                       │  + RAG (LlamaIndex)
                                       └─────────────────┘
```

## Features

- **Voice Conversation**: Real-time speech-to-text and text-to-speech
- **PDF Upload**: Upload cooking PDFs directly through the UI
- **RAG Integration**: Answers questions from uploaded cooking PDFs
- **Live Transcript**: See the conversation as it happens
- **Tool Calls**: Search recipes by ingredients

## Tech Stack

| Component | Technology |
|-----------|------------|
| Voice Agent | LiveKit Agents (Python) |
| STT | AssemblyAI |
| LLM | OpenAI GPT-4.1-mini |
| TTS | Cartesia |
| RAG | LlamaIndex |
| Frontend | Next.js + React |
| Real-time | LiveKit Cloud |

## Quick Start

### Prerequisites

- Python 3.11+ with `uv` package manager
- Node.js 18+ with `pnpm`
- LiveKit Cloud account ([cloud.livekit.io](https://cloud.livekit.io))
- OpenAI API key ([platform.openai.com](https://platform.openai.com))

### 1. Setup Environment

Copy the example environment files and add your API keys:

```bash
# Agent environment
cp agent/.env.example agent/.env.local
# Edit agent/.env.local with your keys

# Frontend environment
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local with your keys
```

You'll need:
- **LiveKit credentials** from [cloud.livekit.io](https://cloud.livekit.io)
- **OpenAI API key** from [platform.openai.com](https://platform.openai.com)

### 2. Add a Cooking PDF (Optional)

Place any cooking PDF in `agent/data/` for RAG capabilities:

```bash
cp your-cookbook.pdf agent/data/
```

### 3. Start the Agent

```bash
cd agent
uv sync
uv run python main.py dev
```

### 4. Start the Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

### 5. Use the App

Open [http://localhost:3000](http://localhost:3000), click "Start Call", and talk to SousChef!

## Project Structure

```
SousChef AI/
├── agent/                 # Python voice agent
│   ├── main.py           # Agent entry point
│   ├── rag.py            # LlamaIndex RAG
│   ├── data/             # PDF documents
│   └── .env.local        # Agent credentials
│
├── frontend/             # Next.js frontend
│   ├── app/
│   │   ├── page.tsx      # Voice interface
│   │   └── api/token/    # Token generation
│   └── .env.local        # Frontend credentials
│
└── README.md
```

## RAG Integration

The agent uses LlamaIndex for RAG:

1. **Ingestion**: PDFs in `agent/data/` are chunked and embedded
2. **Storage**: Vectors are persisted to `agent/storage/`
3. **Query**: User questions trigger semantic search
4. **Context**: Retrieved chunks are injected into the conversation

## Design Decisions

- **STT-LLM-TTS Pipeline**: Chose over realtime API for flexibility
- **LlamaIndex**: Proven RAG framework with simple PDF ingestion
- **LiveKit Cloud**: Managed infrastructure, easy setup
- **AssemblyAI + Cartesia**: High-quality voice with low latency

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Agent won't start | Check `OPENAI_API_KEY` in `.env.local` |
| No transcription | Ensure microphone permissions |
| RAG not working | Add PDF to `agent/data/` and restart |
