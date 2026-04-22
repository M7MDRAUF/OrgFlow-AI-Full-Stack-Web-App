# OrgFlow AI — Teammate Onboarding Guide

Hey! Here's everything you need to clone the repo and run the full stack locally. Follow the steps in order — total time ~20–30 min (most of it is downloading the Ollama models).

---

## 0. Prerequisites (install once)

Install these in order. Use the exact versions / sources below to avoid conflicts.

### 0.1 Node.js 20 LTS (required)

- Download: https://nodejs.org/en/download (pick **LTS — 20.x**)
- Verify in a **new** PowerShell window:
  ```powershell
  node -v   # should print v20.x.x
  npm -v    # should print 10.x.x
  ```

### 0.2 Git

- Download: https://git-scm.com/download/win
- During install accept defaults; verify:
  ```powershell
  git --version
  ```

### 0.3 VS Code + extensions

- VS Code: https://code.visualstudio.com/
- Recommended extensions (open VS Code, Ctrl+Shift+X, search & install):
  - **ESLint** (`dbaeumer.vscode-eslint`)
  - **Prettier - Code formatter** (`esbenp.prettier-vscode`)
  - **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
  - **GitLens** (`eamodio.gitlens`)
  - **GitHub Pull Requests** (`github.vscode-pull-request-github`)
  - **MongoDB for VS Code** (`mongodb.mongodb-vscode`)

### 0.4 MongoDB Community Server 7.x (local DB)

- Download: https://www.mongodb.com/try/download/community
  - Version: **7.0+**, Platform: Windows x64, Package: msi
- During install:
  - Choose **Complete** setup
  - **Check** "Install MongoDB as a Service" (so it auto-starts on boot)
  - You can **uncheck** MongoDB Compass if you'll use the VS Code extension instead
- Verify the service is running:
  ```powershell
  Get-Service MongoDB
  # Status should be "Running"
  ```
- Test the connection:
  ```powershell
  Test-NetConnection localhost -Port 27017
  # TcpTestSucceeded should be True
  ```

### 0.5 Ollama (local LLM runtime)

- Download: https://ollama.com/download/windows
- Run the installer; it adds Ollama to your PATH and starts a background service on `http://localhost:11434`.
- Verify:
  ```powershell
  ollama --version
  Invoke-WebRequest http://localhost:11434/api/tags | Select-Object -ExpandProperty Content
  ```

### 0.6 Pull the **exact** AI models the project expects

The API reads `OLLAMA_CHAT_MODEL=gemma3` and `OLLAMA_EMBED_MODEL=nomic-embed-text` from `.env`. You **must** pull these two — anything else will fail at runtime.

```powershell
ollama pull nomic-embed-text   # ~274 MB — embedding model (768-dim vectors)
ollama pull gemma3             # ~3.3 GB — chat/answer model
```

Confirm both are installed:

```powershell
ollama list
# You should see: nomic-embed-text:latest  AND  gemma3:latest
```

---

## 1. Clone the repository in VS Code

You have two equally good options. Pick **one**.

### Option A — Clone via VS Code UI (easiest)

1. Open VS Code.
2. Press `Ctrl+Shift+P` → type **`Git: Clone`** → Enter.
3. Paste the repo URL:
   ```
   https://github.com/M7MDRAUF/OrgFlow-AI-Full-Stack-Web-App.git
   ```
4. Choose a folder (e.g. `C:\Users\<you>\Documents\Dev`).
5. When VS Code asks **"Would you like to open the cloned repository?"** → click **Open**.
6. If it asks **"Do you trust the authors?"** → click **Yes, I trust the authors**.

### Option B — Clone via terminal

```powershell
cd $HOME\Documents
mkdir Dev -ErrorAction SilentlyContinue
cd Dev
git clone https://github.com/M7MDRAUF/OrgFlow-AI-Full-Stack-Web-App.git
code OrgFlow-AI-Full-Stack-Web-App
```

> **Important:** the repo is a `.gitignore`-ed monorepo. Real `.env` files are **not** in the repo (for security). You'll create them from the committed `.env.example` files in step 3.

---

## 2. Install all workspace dependencies

From the repo root, in VS Code's terminal (`` Ctrl+` ``):

```powershell
npm install
```

This installs everything for `apps/api`, `apps/web`, and all `packages/*` workspaces in one go. Takes ~2–3 min the first time.

---

## 3. Create your local `.env` files

There are **two** `.env` files to create. Just copy the examples — the defaults already match the local-dev setup (Mongo on 27017, Ollama on 11434, etc.).

```powershell
# Backend env
Copy-Item apps/api/.env.example apps/api/.env

# Frontend env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Then **edit `apps/api/.env`** and replace the JWT secret with a fresh random one (otherwise tokens from different machines will collide):

```powershell
# Generate a secure secret and print it:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output as the value of `JWT_SECRET=` in `apps/api/.env`.

Everything else in the env files can stay as-is for local development.

> **Reminder:** never commit `apps/api/.env` or `apps/web/.env.local` — they're already in `.gitignore`.

---

## 4. Seed the database with demo data

This creates a demo organization, an admin user, a leader, a member, a project, and some tasks so you can log in immediately.

```powershell
npm run seed -w @orgflow/api
```

Default demo credentials (printed at the end of the seed output):

- **Admin:** `admin@demo.local` / `Admin123!`
- **Leader:** `leader@demo.local` / `Leader123!`
- **Member:** `member@demo.local` / `Member123!`

---

## 5. Run the app (two terminals)

Open **two** terminals in VS Code (click the `+` in the terminal panel).

**Terminal 1 — API (port 4000):**

```powershell
npm run dev:api
```

Wait until you see `API listening on http://localhost:4000`.

**Terminal 2 — Web (port 5173):**

```powershell
npm run dev:web
```

Wait until you see `Local: http://localhost:5173/`.

Open http://localhost:5173 in your browser and log in with the demo credentials above.

### Quick health checks

```powershell
# API health
Invoke-WebRequest http://localhost:4000/api/v1/health | Select-Object -ExpandProperty Content
# Expected: {"success":true,"data":{"status":"ok"}}

# Note: http://localhost:4000/  returns 404 — that's normal (REST API has no root route).
```

---

## 6. (Optional) Run the test suites and quality gates

```powershell
npm run typecheck   # TypeScript across all workspaces
npm run lint        # ESLint
npm test            # Vitest (api + web)
npm run gates       # Runs typecheck + lint + format:check + test
```

---

## 7. Daily workflow

```powershell
git pull                    # get latest from main
npm install                 # only if package.json changed
npm run dev:api             # terminal 1
npm run dev:web             # terminal 2
```

When you change code:

- Husky + lint-staged will auto-format and lint your staged files on commit.
- Use **conventional commits** (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
- Never push directly to `main` once we set up branch protection — use feature branches: `git checkout -b feat/your-feature`.

---

## 8. Troubleshooting

| Symptom                                            | Fix                                                                                 |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `MongoServerError: connect ECONNREFUSED ::1:27017` | MongoDB service isn't running. `Start-Service MongoDB`                              |
| API logs `ECONNREFUSED 127.0.0.1:11434`            | Ollama isn't running. Open the Ollama app from Start Menu, or run `ollama serve`    |
| API logs `model "gemma3" not found`                | You forgot step 0.6: `ollama pull gemma3`                                           |
| Web shows `Network Error` on login                 | API isn't running on 4000, or `VITE_API_BASE_URL` in `apps/web/.env.local` is wrong |
| `JWT_SECRET must be at least 32 characters`        | You skipped the JWT_SECRET step in section 3                                        |
| Port 4000 or 5173 already in use                   | `Get-NetTCPConnection -LocalPort 4000` then `Stop-Process -Id <PID>`                |
| `npm install` fails on optional deps               | Delete `node_modules` and `package-lock.json`, re-run `npm install`                 |

---

## 9. Repo URL & contact

- **Repo:** https://github.com/M7MDRAUF/OrgFlow-AI-Full-Stack-Web-App
- Ping me on the group chat if any step fails — share the **exact error message** and which step number.

You're done! 🚀
