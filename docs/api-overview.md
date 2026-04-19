# OrgFlow AI — API Route Reference

Base path: **`/api/v1`**

All routes except `/auth/login` and `/auth/complete-invite` require a valid JWT via the `Authorization: Bearer <token>` header.

---

## Auth — `/api/v1/auth`

| Method | Path               | Auth | Guards     | Description                                          |
| ------ | ------------------ | ---- | ---------- | ---------------------------------------------------- |
| POST   | `/login`           | —    | rate limit | Authenticate with email + password, returns JWT      |
| GET    | `/me`              | JWT  | —          | Get current authenticated user profile               |
| POST   | `/logout`          | JWT  | —          | Logout / invalidate session                          |
| POST   | `/invite`          | JWT  | `admin`    | Invite a new user to the organization                |
| POST   | `/complete-invite` | —    | rate limit | Complete invitation (set password, activate account) |

---

## Users — `/api/v1/users`

_All routes require JWT._

| Method | Path          | Guards  | Description                           |
| ------ | ------------- | ------- | ------------------------------------- |
| GET    | `/`           | —       | List users (filter: `role`, `teamId`) |
| GET    | `/:id`        | —       | Get user by ID                        |
| PATCH  | `/:id`        | `admin` | Update user (name, role)              |
| PATCH  | `/:id/status` | `admin` | Update user status (active/disabled)  |

---

## Teams — `/api/v1/teams`

_All routes require JWT._

| Method | Path   | Guards  | Description                              |
| ------ | ------ | ------- | ---------------------------------------- |
| GET    | `/`    | —       | List all teams in the organization       |
| GET    | `/:id` | —       | Get team by ID                           |
| POST   | `/`    | `admin` | Create a new team                        |
| PATCH  | `/:id` | `admin` | Update team (name, description, members) |
| DELETE | `/:id` | `admin` | Delete a team                            |

---

## Projects — `/api/v1/projects`

_All routes require JWT._

| Method | Path   | Guards | Description                                |
| ------ | ------ | ------ | ------------------------------------------ |
| GET    | `/`    | —      | List projects (filter: `teamId`, `status`) |
| GET    | `/:id` | —      | Get project by ID                          |
| POST   | `/`    | —      | Create a new project                       |
| PATCH  | `/:id` | —      | Update project (name, description, status) |
| DELETE | `/:id` | —      | Delete a project                           |

---

## Tasks — `/api/v1/tasks`

_All routes require JWT._

| Method | Path            | Guards | Description                                                          |
| ------ | --------------- | ------ | -------------------------------------------------------------------- |
| GET    | `/`             | —      | List tasks (filter: `projectId`, `status`, `assigneeId`, `priority`) |
| GET    | `/:id`          | —      | Get task by ID                                                       |
| POST   | `/`             | —      | Create a new task                                                    |
| PATCH  | `/:id`          | —      | Update task fields                                                   |
| PATCH  | `/:id/status`   | —      | Update task status (todo → in_progress → in_review → done)           |
| DELETE | `/:id`          | —      | Delete a task                                                        |
| GET    | `/:id/comments` | —      | List comments on a task                                              |
| POST   | `/:id/comments` | —      | Add a comment to a task                                              |

---

## Dashboard — `/api/v1/dashboard`

_All routes require JWT._

| Method | Path | Guards | Description                                              |
| ------ | ---- | ------ | -------------------------------------------------------- |
| GET    | `/`  | —      | Get dashboard statistics (filter: `teamId`, `projectId`) |

---

## Announcements — `/api/v1/announcements`

_All routes require JWT._

| Method | Path        | Guards | Description                           |
| ------ | ----------- | ------ | ------------------------------------- |
| GET    | `/`         | —      | List announcements (filter: `target`) |
| GET    | `/:id`      | —      | Get announcement by ID                |
| POST   | `/`         | —      | Create an announcement                |
| PATCH  | `/:id`      | —      | Update an announcement                |
| DELETE | `/:id`      | —      | Delete an announcement                |
| POST   | `/:id/read` | —      | Mark announcement as read             |

---

## Organizations — `/api/v1/organizations`

_All routes require JWT._

| Method | Path       | Guards  | Description                         |
| ------ | ---------- | ------- | ----------------------------------- |
| GET    | `/current` | —       | Get the current user's organization |
| PATCH  | `/current` | `admin` | Update organization settings        |

---

## AI Documents — `/api/v1/ai/documents`

_All routes require JWT._

| Method | Path           | Guards                          | Description                                             |
| ------ | -------------- | ------------------------------- | ------------------------------------------------------- |
| GET    | `/`            | —                               | List ingested documents (filter: `teamId`, `projectId`) |
| POST   | `/`            | `leader`, rate limit (10/15min) | Upload and ingest a document (multipart `file` field)   |
| GET    | `/:id`         | —                               | Get document by ID                                      |
| POST   | `/:id/reindex` | `leader`                        | Re-index an existing document                           |
| DELETE | `/:id`         | `leader`                        | Delete document and associated chunks                   |

---

## AI Chat — `/api/v1/ai/chat`

_All routes require JWT._

| Method | Path       | Guards              | Description                                               |
| ------ | ---------- | ------------------- | --------------------------------------------------------- |
| POST   | `/`        | rate limit (30/min) | Send a message to the AI assistant (permission-aware RAG) |
| GET    | `/history` | —                   | Get chat history for the current user                     |

---

## Common Patterns

- **Validation**: All request bodies and query params are validated with Zod schemas via `validate()` middleware.
- **Response format**: All successful responses use `{ success: true, data: ... }`. Errors use `{ success: false, error: { message, code } }`.
- **Rate limiting**: Global limit of 300 req/min on all `/api/v1` routes. Stricter per-route limits on login, invite completion, document upload, and chat.
- **Scope filtering**: Services automatically filter results by the caller's organization, team, and role. See [rbac.md](rbac.md).
