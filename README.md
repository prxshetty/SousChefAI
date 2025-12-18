# SousChef AI 👨‍🍳

A RAG-enabled voice cooking assistant built with LiveKit. Upload cooking PDFs, ask questions, get recipe advice, create shopping lists and timers and have a natural conversation about food — all through voice!

🌐 **[Live Demo](https://main.d2iyik5u6ri7ha.amplifyapp.com/)**

<img width="1280" height="1422" alt="demo" src="https://github.com/user-attachments/assets/668759f5-ae6c-4409-b8e4-19d948716646" />


---

## 📖 Design Document

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Browser                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Next.js Frontend (AWS Amplify)                   │   │
│  │  - Voice selection (male/female)                                     │   │
│  │  - PDF upload for RAG                                                │   │
│  │  - Real-time transcript display                                      │   │
│  │  - WebRTC audio streaming                                            │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │ WebSocket + WebRTC
                                      ▼
                         ┌────────────────────────┐
                         │    LiveKit Cloud       │
                         │  (Room Management)     │
                         │  - Audio routing       │
                         │  - Participant mgmt    │
                         └───────────┬────────────┘
                                     │ Worker Connection
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Python Agent (AWS EC2 / Local)                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      LiveKit Agents Framework                        │   │
│  │                                                                      │   │
│  │   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐         │   │
│  │   │   VAD   │ -> │   STT   │ -> │   LLM   │ -> │   TTS   │         │   │
│  │   │ Silero  │    │ Speech- │    │  GPT-5  │    │Deepgram │         │   │
│  │   └─────────┘    │  matics │    │  mini   │    │ Aura 2  │         │   │
│  │                  └─────────┘    └────┬────┘    └─────────┘         │   │
│  │                                      │                              │   │
│  │                              ┌───────▼───────┐                      │   │
│  │                              │   RAG Query   │                      │   │
│  │                              │  (LlamaIndex) │                      │   │
│  │                              └───────┬───────┘                      │   │
│  │                                      │                              │   │
│  │                              ┌───────▼───────┐                      │   │
│  │                              │   Pinecone    │                      │   │
│  │                              │ (Vector Store)│                      │   │
│  └──────────────────────────────┴───────────────┴──────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### End-to-End Flow

1. **User Opens App** → Frontend loads on AWS Amplify
2. **Voice Selection** → User picks male or female voice
3. **Room Creation** → Frontend calls `/api/token` which creates a LiveKit room with voice metadata
4. **Agent Joins** → Python agent (on EC2) receives job from LiveKit Cloud and joins the room
5. **Voice Capture** → Browser captures microphone audio via WebRTC
6. **VAD (Voice Activity Detection)** → Silero detects when user is speaking
7. **STT (Speech-to-Text)** → Speechmatics transcribes audio to text
8. **RAG Query** → If relevant, LLM uses `search_cookbook` tool to query Pinecone
9. **LLM Processing** → GPT-5-mini generates response, may call tools (timer, shopping list)
10. **TTS (Text-to-Speech)** → Deepgram Aura 2 converts response to natural speech
11. **Audio Playback** → Audio streams back to browser via WebRTC

### RAG Integration

The RAG (Retrieval-Augmented Generation) pipeline allows users to upload their own cooking PDFs:

```
PDF Upload → Chunking → Embedding → Pinecone → Query → Context Injection → LLM
```

**Implementation:**

1. **Document Upload**: User uploads PDF via frontend → saved to `/tmp/` on server
2. **Ingestion (LlamaIndex)**:
   - PDF parsed with `SimpleDirectoryReader`
   - Text chunked using `SentenceSplitter` (chunk_size=512, overlap=50)
   - Chunks embedded using OpenAI's `text-embedding-3-small`
3. **Vector Storage (Pinecone)**:
   - Embeddings stored in Pinecone serverless index
   - Namespace: `souschef` for isolation
4. **Query Flow**:
   - User asks cooking question
   - Keywords detected (recipe, cook, ingredient, etc.)
   - Query embedded and searched in Pinecone (top_k=3)
   - Retrieved context injected into LLM conversation
5. **RPC Integration**:
   - Frontend calls `reload_cookbook` RPC after upload
   - Agent re-indexes in background thread (non-blocking)
   - Agent verbally confirms when indexing completes

### Agent Tools

The agent has built-in function tools that the LLM intelligently decides when to use:

| Tool | Usage | UI Feedback |
|------|-------|-------------|
| **search_cookbook** | Queries uploaded PDFs for recipes/info | Context woven into response |
| **set_timer** | "Set a 10 minute timer for pasta" | Circular timer display (bottom-right) |
| **clear_timers** | "Cancel the timer" | Removes all active timers |
| **add_to_shopping_list** | "Add eggs, butter, milk to my list" | Floating shopping list (bottom-left) |
| **remove_from_shopping_list** | "I already have eggs" | Item removed from list |
| **clear_shopping_list** | "Clear my shopping list" | List emptied |
| **reload_cookbook** | Triggered after PDF upload | Agent confirms verbally |

**Tool Architecture:**
- Tools are `@function_tool()` decorated methods on the Agent class
- LLM reads docstrings to understand when to call each tool
- Data sent to frontend via LiveKit data channel for real-time UI updates
- Shopping list includes AI-inferred categories and emojis (🥚 Eggs → Dairy)

### Tools & Frameworks

| Category | Technology | Purpose |
|----------|------------|---------|
| **Voice Agent** | LiveKit Agents SDK | Real-time voice infrastructure |
| **VAD** | Silero VAD | Detect speech activity |
| **STT** | Speechmatics | Speech-to-text transcription |
| **LLM** | OpenAI GPT-5-mini | Conversational AI |
| **TTS** | Deepgram Aura 2 | Natural text-to-speech |
| **Turn Detection** | LiveKit Multilingual Model | Know when user stops talking |
| **RAG Framework** | LlamaIndex | Document ingestion and querying |
| **Vector Database** | Pinecone (Serverless) | Semantic search |
| **Embeddings** | OpenAI text-embedding-3-small | Text vectorization |
| **Frontend** | Next.js 14 + React 18 | Web application |
| **Styling** | Tailwind CSS + Framer Motion | UI and animations |
| **Frontend Hosting** | AWS Amplify | Serverless Next.js hosting |
| **Agent Hosting** | AWS EC2 (t2.micro) | Python agent runtime |
| **Real-time Infra** | LiveKit Cloud | WebRTC room management |

---

## 🚀 Setup Instructions

### Prerequisites

- Python 3.11+ with [`uv`](https://github.com/astral-sh/uv) package manager
- Node.js 18+ with `npm`
- [LiveKit Cloud](https://cloud.livekit.io) account
- [OpenAI API key](https://platform.openai.com)
- [Pinecone API key](https://www.pinecone.io/) (free tier works)

### Option 1: Run Locally

#### 1. Clone the Repository

```bash
git clone https://github.com/prxshetty/SousChefAI.git
cd SousChefAI
```

#### 2. Setup Agent

```bash
cd agent

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your API keys:
# - LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
# - OPENAI_API_KEY
# - PINECONE_API_KEY

# Install dependencies and run
uv sync
uv run python main.py dev
```

#### 3. Setup Frontend

```bash
cd frontend

# Copy environment template
cp .env.example .env.local

# Edit .env.local with same LiveKit credentials

# Install and run
npm install
npm run dev
```

#### 4. Use the App

Open [http://localhost:3000](http://localhost:3000), select a voice, and start talking!

### Option 2: Deploy to AWS (Production)

#### Frontend: AWS Amplify

1. Connect your GitHub repo to AWS Amplify
2. Set app root to `frontend`
3. Add environment variables:
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
   - `LIVEKIT_URL`
   - `NEXT_PUBLIC_LIVEKIT_URL`
4. Deploy

#### Agent: AWS EC2

1. Launch t2.micro (Amazon Linux 2023)
2. SSH in and setup:

```bash
# Install dependencies
sudo yum update -y
sudo yum install python3.11 git -y
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

# Add swap (needed for 1GB RAM instances)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Clone and setup
git clone https://github.com/prxshetty/SousChefAI.git
cd SousChefAI/agent
nano .env.local  # Add your API keys
uv sync
uv run python main.py download-files

# Run in background
nohup uv run python main.py start > agent.log 2>&1 &
```

---

## Project Structure

```
SousChef AI/
├── agent/                     # Python voice agent
│   ├── main.py               # Agent entry point, session handling
│   ├── rag.py                # LlamaIndex + Pinecone RAG logic
│   ├── data/                 # Uploaded PDFs (gitignored)
│   ├── .env.example          # Environment template
│   └── pyproject.toml        # Python dependencies
│
├── frontend/                  # Next.js frontend
│   ├── app/
│   │   ├── page.tsx          # Main voice interface
│   │   ├── api/token/        # LiveKit token generation
│   │   └── api/upload/       # PDF upload handler
│   ├── components/ui/hero/   # Voice UI components
│   ├── next.config.js        # Next.js config (env vars)
│   └── .env.example          # Environment template
│
└── README.md                  # This file
```

---

## Design Decisions & Assumptions

### Trade-offs & Limitations

| Decision | Trade-off | Reasoning |
|----------|-----------|-----------|
| **STT-LLM-TTS Pipeline** vs OpenAI Realtime API | Higher latency (~1-2s) but more flexibility | Can swap any component, use custom RAG, better control |
| **t2.micro with Swap** vs larger instance | Slower under load, but free tier eligible | Demo-appropriate; upgrade to t2.small for production |
| **Pinecone Serverless** vs self-hosted | Vendor dependency but zero ops | Free tier sufficient; managed scaling |
| **Per-session RAG clearing** | User must re-upload each session | Prevents data leakage between users; simplifies auth |
| **Multiple PDFs per session** | All uploads accumulated and re-indexed together | Users can query across multiple cookbooks within a session |

### Hosting Assumptions

- **Frontend (AWS Amplify)**: Serverless Next.js hosting with automatic HTTPS, CI/CD from GitHub
- **Agent (AWS EC2)**: Always-on instance required for WebSocket connections; t2.micro with 2GB swap sufficient for demo load
- **LiveKit Cloud**: Managed WebRTC infrastructure; free tier for development
- **Pinecone**: Serverless vector DB; free tier provides 100K vectors

### RAG Assumptions

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Vector Database** | Pinecone Serverless | Simple API, generous free tier, no infra management |
| **Embedding Model** | OpenAI text-embedding-3-small | Cost-effective ($0.02/1M tokens), good quality |
| **Chunk Size** | 512 tokens | Balances context preservation with retrieval precision |
| **Chunk Overlap** | 50 tokens | Prevents losing context at chunk boundaries |
| **Top-K Results** | 3 | Enough context without overwhelming LLM |
| **Retrieval Trigger** | Keyword detection | Simple heuristic; could upgrade to semantic intent detection |

### LiveKit Agent Design

- **Agent Registration**: Agent registers with LiveKit Cloud on startup; dispatched when room is created
- **Voice Metadata**: Room name encodes voice preference (`souschef-male-*` or `souschef-female-*`)
- **RPC Methods**: Frontend can call agent functions (`reload_cookbook`, `clear_cookbook`) via LiveKit RPC
- **Session Isolation**: Each user session gets its own room; cookbook cleared on disconnect
- **Non-blocking Indexing**: PDF indexing runs in background thread so agent remains responsive

---


## License

MIT License - feel free to use and modify!
