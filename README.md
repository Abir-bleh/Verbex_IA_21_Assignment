# Verbex AI Agent Management Platform

A full-stack SaaS platform where users can sign up, create AI chatbot "agents", and embed them on any website with public chat links.

## Tech Stack

| Component  | Technology                   |
| ---------- | ---------------------------- |
| Backend    | Python 3.11+ FastAPI         |
| Database   | PostgreSQL + asyncpg         |
| Frontend   | Next.js 15 + React 18        |
| LLM        | OpenRouter API (free models) |
| Deployment | Docker + Docker Compose      |
| Auth       | JWT + Bcrypt                 |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- PostgreSQL database (or use NeonDB)
- OpenRouter API key (free at [openrouter.ai](https://openrouter.ai))

### 1. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```bash
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/verbex_db
JWT_SECRET=your-secret-key-here
OPENROUTER_API_KEY=sk-or-your-key-here
```

### 2. Start All Services

```bash
docker-compose up --build
```

This starts:

- **Auth Service**: http://localhost:8081
- **Agent Service**: http://localhost:8082
- **Chat Service**: http://localhost:8083
- **Frontend**: http://localhost:3000

### 3. Access the Platform

- **Web App**: http://localhost:3000
- **Sign up** with email and password (min 8 chars, letters, numbers, special chars)
- **Create agents**, configure them, and get public chat links
- **Share links** to embed chat on your website

## Architecture

### Microservices Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
│                     Port 3000                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Dashboard | Chat | Agent Settings | Conversations │   │
│  └─────────────────────────────────────────────────────┘   │
└────┬────────────────────┬─────────────────────┬─────────────┘
     │                    │                     │
     ▼                    ▼                     ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│  Auth Svc    │  │ Agent Svc    │  │  Chat Svc        │
│  (8081)      │  │ (8082)       │  │  (8083)          │
│              │  │              │  │                  │
│ • Signup     │  │ • Create     │  │ • Send msgs      │
│ • Login      │  │ • List       │  │ • Get convs      │
│ • JWT token  │  │ • Update     │  │ • LLM calls      │
│ • Verify     │  │ • Delete     │  │ • Public chat    │
│              │  │ • API keys   │  │                  │
└──────────────┘  └──────────────┘  └──────────────────┘
     │                    │                     │
     └────────────────────┴─────────────────────┘
                     ▼
          ┌──────────────────────┐
          │   PostgreSQL DB      │
          │   (AsyncPG)          │
          │                      │
          │ • Users              │
          │ • Agents             │
          │ • Conversations      │
          │ • Messages           │
          └──────────────────────┘
```

### Service Communication

- **Frontend ↔ Services**: HTTP REST APIs
- **Inter-service**: Service URLs from `docker-compose.yml` environment
- **Database**: Shared PostgreSQL connection pool
- **Auth**: Every request includes JWT token (except login/signup)

## Project Structure

```
verbex/
├── frontend/
│   ├── app/
│   │   ├── auth/                 # Login & signup pages
│   │   ├── dashboard/            # Main dashboard
│   │   ├── chat/                 # Private chat interface
│   │   ├── public/               # Public chat links
│   │   ├── agents/               # Agent management
│   │   └── settings/             # User settings
│   ├── styles/                   # Global CSS
│   ├── package.json
│   └── next.config.js
│
├── services/
│   ├── auth-service/             # Authentication
│   │   ├── app/
│   │   │   ├── models.py         # User model
│   │   │   ├── service.py        # Auth logic
│   │   │   ├── routes.py         # API endpoints
│   │   │   └── main.py           # FastAPI app
│   │   └── requirements.txt
│   │
│   ├── agent-service/            # Agent management
│   │   ├── app/
│   │   │   ├── models.py         # Agent model
│   │   │   ├── service.py        # Agent logic
│   │   │   ├── routes.py         # API endpoints
│   │   │   └── main.py           # FastAPI app
│   │   └── requirements.txt
│   │
│   └── chat-service/             # Chat & LLM
│       ├── app/
│       │   ├── models.py         # Message model
│       │   ├── service.py        # Chat logic
│       │   ├── routes.py         # API endpoints
│       │   └── main.py           # FastAPI app
│       └── requirements.txt
│
├── docker-compose.yml            # Service orchestration
├── .env.example                  # Environment template
└── README.md                     # This file
```

## API Documentation

### Auth Service (Port 8081)

#### `POST /auth/signup`

Create new user account.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!@"
}
```

**Response (201):**

```json
{
  "status": "success",
  "data": {
    "user_id": "uuid-here",
    "token": "eyJhbGciOiJIUzI1NiIsImtpZCI6InRlc3QifQ..."
  }
}
```

**Password Requirements:**

- Minimum 8 characters
- At least one letter (a-z, A-Z)
- At least one number (0-9)
- At least one special character (@$!%\*?&)

#### `POST /auth/login`

Login existing user.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!@"
}
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsImtpZCI6InRlc3QifQ..."
  }
}
```

#### `GET /auth/verify`

Verify JWT token validity.

**Headers:**

```
Authorization: Bearer {token}
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "user_id": "uuid-here",
    "email": "user@example.com"
  }
}
```

### Agent Service (Port 8082)

#### `POST /agents`

Create new agent.

**Request:**

```json
{
  "name": "Support Bot",
  "description": "24/7 customer support",
  "model": "gpt-3.5-turbo",
  "system_prompt": "You are a helpful support agent...",
  "temperature": 0.7
}
```

**Response (201):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid-here",
    "name": "Support Bot",
    "created_at": "2026-04-06T10:00:00Z"
  }
}
```

#### `GET /agents`

List all agents for user.

**Response (200):**

```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid-1",
      "name": "Support Bot",
      "model": "gpt-3.5-turbo",
      "created_at": "2026-04-06T10:00:00Z"
    }
  ]
}
```

#### `GET /agents/:id`

Get agent details (auth required).

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid-here",
    "name": "Support Bot",
    "system_prompt": "You are...",
    "model": "gpt-3.5-turbo",
    "temperature": 0.7
  }
}
```

#### `PUT /agents/:id`

Update agent configuration.

**Request:**

```json
{
  "system_prompt": "Updated prompt...",
  "temperature": 0.8
}
```

#### `DELETE /agents/:id`

Delete agent.

**Response (200):**

```json
{
  "status": "success",
  "message": "Agent deleted"
}
```

#### `GET /agents/public/:id`

Get public agent (no authentication required).

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid-here",
    "name": "Support Bot"
  }
}
```

#### `GET /agents/:id/analytics`

Get analytics for an agent (conversations count, messages count, last activity).

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "totalConversations": 5,
    "totalMessages": 42,
    "lastActivityAt": "2026-04-06T14:30:00Z"
  }
}
```

#### `POST /apikeys`

Create or regenerate API key for programmatic access.

**Headers:**

```
Authorization: Bearer {token}
```

**Response (201):**

```json
{
  "status": "success",
  "data": {
    "key": "sk_your_api_key_here_do_not_share"
  }
}
```

**Note:** The full key is only shown once at creation. Store it securely.

#### `GET /apikeys`

Get API key info (does not return the actual key).

**Headers:**

```
Authorization: Bearer {token}
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid-here",
    "keyPreview": "sk_*****...abc123",
    "createdAt": "2026-04-06T10:00:00Z"
  }
}
```

#### `GET /models`

List available LLM models.

**Response (200):**

```json
{
  "status": "success",
  "data": [
    {
      "id": "gpt-3.5-turbo",
      "name": "GPT-3.5 Turbo",
      "provider": "openrouter"
    },
    {
      "id": "llama-2-7b",
      "name": "Llama 2 7B",
      "provider": "openrouter"
    }
  ]
}
```

### Chat Service (Port 8083)

#### `POST /chat`

Send message to agent's LLM. Supports both public and authenticated (API key) access.

**Request (Public or API Key):**

```json
{
  "agentId": "uuid-here",
  "message": "Hello, can you help me?",
  "conversationId": "uuid-or-null"
}
```

**Headers (for API key auth):**

```
X-API-Key: sk_your_api_key_here
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "message": "How can I assist you today?",
    "conversation_id": "uuid-here",
    "message_id": "uuid-here"
  }
}
```

**Note:** If agent has a webhook configured, it will be triggered for new conversations.

#### `GET /conversations/:agentId`

Get all conversations for agent.

**Response (200):**

```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid-1",
      "agent_id": "uuid-here",
      "created_at": "2026-04-06T10:00:00Z",
      "message_count": 5
    }
  ]
}
```

#### `GET /conversations/:conversationId/messages`

Get all messages in conversation.

**Response (200):**

```json
{
  "status": "success",
  "data": [
    {
      "id": "msg-uuid-1",
      "role": "user",
      "content": "Hello"
    },
    {
      "id": "msg-uuid-2",
      "role": "assistant",
      "content": "Hi there!"
    }
  ]
}
```

## Development Setup (Local)

### Without Docker

1. **Auth Service:**

   ```bash
   cd services/auth-service
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8081 --reload
   ```

2. **Agent Service:**

   ```bash
   cd services/agent-service
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8082 --reload
   ```

3. **Chat Service:**

   ```bash
   cd services/chat-service
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8083 --reload
   ```

4. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Database Migrations

Database tables are created automatically when services start (using SQLAlchemy with `metadata.create_all()`).

## Features Implemented

✅ **Authentication**

- Email/password signup with strong password validation
- Password strength requirements (8+ chars, letters, numbers, special chars)
- Show/hide password toggle
- JWT-based authentication
- Bcrypt password hashing

✅ **Agent Management**

- Create, read, update, delete agents
- Configure system prompt and temperature
- Multiple LLM model selection
- Public agent access (no authentication needed)
- Agent analytics (conversation count, message count, last activity)
- Webhook configuration for event notifications

✅ **Chat Interface**

- Private chat with agents
- Public chat links (shareable)
- Conversation history
- Real-time message streaming
- Optimistic UI updates with loading states
- Conversations viewer
- API-based chat with API key authentication

✅ **Performance**

- Parallel data fetching
- Optimistic UI (show message before LLM response)
- Loading indicators during response generation
- Efficient database queries

✅ **Security**

- Password validation (frontend + backend)
- JWT token verification
- API key authentication for programmatic access
- Hashed API keys stored in database
- Environment-based configuration
- No sensitive data in frontend code

✅ **API Keys & Integration**

- Generate and manage API keys for programmatic access
- API key preview for verification
- Support for multiple LLM models from OpenRouter (free tier)
- Webhook support for agent events

## AI Tools Usage

### Tools Used

1. **GitHub Copilot Chat** - Main AI assistant
   - Architecture design and system planning
   - Code implementation and debugging
   - Error diagnosis and fixes
   - UI/UX improvements
2. CLAUDE AI - DEBUGGING ERRORS

### Helpful AI Prompt Example

**Prompt:**

```
"I need to add strong password validation to my FastAPI auth service.
Requirements:
- Minimum 8 characters
- At least one letter, one number, one special character (@$!%*?&)
- Should work on both frontend signup form and backend validation

Please provide:
1. Python function for validation
2. React component with live feedback
3. Integration into existing signup endpoint"
```

**Why it was effective:**

- Clear requirements listed upfront
- Specified both backend and frontend needs
- Asked for integration guidance
- Result: Complete implementation in 15 minutes vs 2 hours manual work

### Challenge Faced

**Challenge:** Chat UX felt sluggish when waiting for LLM responses

**Problem:**

- User message sent → waiting for response → UI appeared frozen
- Long delay before any visual feedback
- Users unsure if request was received

**Solution with AI:**

- AI suggested optimistic UI pattern: show user message immediately
- Add loading indicator ("...") while waiting for LLM
- Replace "..." with actual response
- Applied pattern to both private and public chat pages
- Result: Much more responsive UX

```javascript
// Show message immediately (optimistic)
setMessages((prev) => [...prev, { role: "user", content: message }]);
setMessages((prev) => [...prev, { role: "assistant", content: "..." }]);

// Await LLM response
const response = await fetch("/chat", { method: "POST", body });

// Replace loading with actual response
setMessages((prev) =>
  prev.map((msg, idx) =>
    idx === prev.length - 1 ? { ...msg, content: response.message } : msg,
  ),
);
```

## Environment Variables Reference

See `.env.example`:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/verbex_db

# Authentication
JWT_SECRET=your-secret-key-minimum-32-chars

# LLM Integration
OPENROUTER_API_KEY=sk-or-your-key

# Service URLs (Docker networking)
AUTH_SERVICE_URL=http://auth-service:8081
AGENT_SERVICE_URL=http://agent-service:8082
CHAT_SERVICE_URL=http://chat-service:8083

# Frontend (for browser)
NEXT_PUBLIC_AUTH_URL=http://localhost:8081
NEXT_PUBLIC_AGENT_URL=http://localhost:8082
NEXT_PUBLIC_CHAT_URL=http://localhost:8083
```

## Troubleshooting

### Docker containers won't start

```bash
# View logs
docker-compose logs -f [service-name]

# Rebuild from scratch
docker-compose down --volumes
docker-compose up --build
```

### Database connection error

```
ERROR: asyncpg.exceptions.InvalidCatalogNameError: database "verbex_db" does not exist
```

**Solution:**

1. Check `DATABASE_URL` in `.env`
2. For NeonDB, ensure you have a default database selected
3. Verify PostgreSQL is running (if local)

### LLM responses not working

```
ERROR: OPENROUTER_API_KEY not found
```

**Solution:**

- Get API key from [openrouter.ai](https://openrouter.ai)
- Add to `.env`: `OPENROUTER_API_KEY=sk-or-xxx`
- Rebuild Docker: `docker-compose up --build`

### Frontend can't reach backend

```
Failed to fetch from http://localhost:8081
```

**Solution:**

- Verify services are running: `docker-compose ps`
- Check `docker-compose.yml` for correct port mappings
- Verify `NEXT_PUBLIC_*_URL` variables in `.env`

## Deployment

### Production Checklist

- [ ] Change `JWT_SECRET` to 32+ random characters
- [ ] Use production PostgreSQL (not local)
- [ ] Use production OpenRouter API key with rate limits
- [ ] Set `DEBUG=false` in services
- [ ] Enable HTTPS/SSL
- [ ] Setup CI/CD pipeline
- [ ] Configure backups for database
- [ ] Monitor service logs and performance

### Docker Compose Deployment

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## License

MIT License - feel free to use for personal or commercial projects.

## Support

For issues, questions, or feature requests, please open a GitHub issue.
