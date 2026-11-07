# BookLoom

BookLoom is a personal book library built with **React** (the frontend), **FastAPI** (the backend), and **PostgreSQL** (the database). The logo and browser icon are original project artwork stored locally in `frontend/public/bookloom.svg`.

## Pages and features

- **Dashboard:** total books, completed books, average rating, current reading progress, recent books, and six-month activity.
- **My Books:** searchable book cards with filters for genre, reading status, and minimum star rating.
- **Add a Book:** record the title, author, genre, summary, rating, review, cover image URL, publication year, page count, reading status, and favourite flag.
- **Favourites:** a shelf of books you have marked as favourites.
- **Reading List:** group books as want to read, currently reading, or completed; update page progress.
- **Profile & Settings:** save a display name, email, yearly reading goal, and light/dark theme in this browser.
- **Single-owner sign-in:** the Render deployment protects book and catalogue API routes with a shared owner password; local development is open by default.
- **Book details lookup:** after entering a title and author, look for an exact match in Open Library and fill in the available cover, description, genre, publication year, and page count. If several editions match, select the correct one.
- Edit and delete books, with API-side input validation.

## Project folders and files

```text
Book list/
├── backend/
│   ├── app/
│   │   ├── __init__.py       # Marks app as a Python package.
│   │   ├── database.py       # Connects to PostgreSQL and adds new fields safely.
│   │   ├── main.py           # Starts FastAPI, creates tables, and runs migrations.
│   │   ├── models.py         # Describes book rows stored in PostgreSQL.
│   │   ├── schemas.py        # Validates incoming and outgoing API data.
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── auth.py       # Single-owner sign-in and signed session cookie.
│   │       ├── books.py      # Book, favourite, filter, and progress endpoints.
│   │       └── catalog.py    # Exact title/author lookup from Open Library.
│   ├── .env.example          # Template for local database settings.
│   └── requirements.txt      # Python packages used by the backend.
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Navigation, six pages, reusable book cards and forms.
│   │   ├── main.jsx          # Mounts React into the web page.
│   │   └── styles.css        # Layout, colors, and responsive styles.
│   ├── public/
│   │   └── bookloom.svg      # Original logo shown in the browser tab.
│   ├── .env.example          # Template for the backend URL.
│   ├── index.html            # Browser page that loads React.
│   ├── package.json          # Frontend dependencies and commands.
│   └── vite.config.js        # Vite development server configuration.
└── README.md
```

### How the pieces work together

1. React displays the website and sends HTTP requests to FastAPI.
2. FastAPI checks the request, then reads or writes rows using SQLAlchemy.
3. PostgreSQL stores the book records, so they remain available after restarting the app.

The `books` table is created automatically when the backend starts, but the PostgreSQL **database itself** must exist first. On startup, the backend adds newly introduced book columns to an older `books` table without deleting existing rows.

The book record includes a title, author, genre, rating, summary, optional cover URL, reading status, total pages, pages read, optional review, favourite flag, date added, and completion date. Profile settings are stored in this browser, not in PostgreSQL. This beginner project does not create user accounts.

When looking up a book, BookLoom sends the **title and author you entered** to the public Open Library catalogue. It only returns candidates with an exact title and author match. One exact match is filled in automatically; if there are multiple editions, choose the correct one. Review the cover, description, and edition before saving: catalogue records can be incomplete or incorrect. If a record has no publisher description, the catalogue's first sentence may be offered instead. You can always edit the result or enter details yourself.

## 1. Create the PostgreSQL database

Make sure PostgreSQL is installed and running on port **5432**. The settings you provided are database name `booklist` and password `root`. This project assumes the PostgreSQL username is `postgres`; use your actual username if it is different.

Using pgAdmin, connect to your local PostgreSQL server, open the Query Tool, and run:

```sql
CREATE DATABASE booklist;
```

Alternatively, in the SQL Shell (`psql`), connect to the server and run the same command. If the database already exists, do not create it again.

## 2. Configure and run the backend (Windows PowerShell)

Open PowerShell in the `backend` folder:

```powershell
cd "C:\Users\Admin\OneDrive\Desktop\Book list\backend"
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

In `.env`, replace `YOUR_POSTGRES_PASSWORD` with your PostgreSQL password (`root`, if that is the password configured on your local server). Keep this file private; it is ignored by Git.

Then create a Python virtual environment, install dependencies, and start the API:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8001
```

If PowerShell prevents activation, you can run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in that terminal and activate again. Keep the backend terminal open. Visit [http://localhost:8001/docs](http://localhost:8001/docs) to try the API.

Local development has sign-in disabled by default. To test it locally, set `BOOKLOOM_AUTH_ENABLED=true` in `backend/.env`, choose a password of at least 12 characters for `BOOKLOOM_PASSWORD`, and set `SESSION_SECRET` to a random value of at least 32 characters. Keep `.env` private.

## 3. Install and run the frontend

Open a **second** PowerShell window:

```powershell
cd "C:\Users\Admin\OneDrive\Desktop\Book list\frontend"
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install
npm run dev -- --port 5174
```

Open [http://localhost:5174](http://localhost:5174). Keep both the backend and frontend terminals running while using the app. These instructions use ports 8001 and 5174 to avoid interfering with other development servers that may already be using the default ports.

## 4. Deploy to Render

The root `render.yaml` is a Render Blueprint that creates three services: the FastAPI backend, a PostgreSQL database, and the React static site. It uses Render's **Free** plans to avoid automatic charges. Free web services can take about a minute to wake after inactivity, and a free Render PostgreSQL database expires after 30 days. Upgrade the database before that deadline if you need to keep your data.

> **Privacy:** The deployed API requires one owner password. Anyone you share it with can access the same library. Choose a strong, unique password and do not use this app for sensitive information. This is a single shared library, not separate accounts.

1. Make sure the project is pushed to the GitHub repository connected to Render. Do not commit `backend/.env` or `frontend/.env`; they contain local settings.
2. Sign in at [dashboard.render.com](https://dashboard.render.com), choose **New → Blueprint**, and connect the BookLoom GitHub repository.
3. Select the branch you want to deploy. When Render asks for `BOOKLOOM_PASSWORD`, enter a strong password of at least 12 characters. Render generates the session-signing secret automatically.
4. Review the three services and their Free plans, then apply the Blueprint.
5. Wait for the database and both services to finish deploying. Open `https://bookloom-api.onrender.com/health`; it should return `{"status":"ok"}`. Then visit `https://bookloom-frontend.onrender.com` and sign in with the password you entered.
6. If Render assigns different `onrender.com` names because those names are already taken, update `VITE_API_URL` on the static site to the API's actual URL and `FRONTEND_ORIGIN` on the API to the static site's actual URL, then redeploy both.

The API's `DATABASE_URL` is linked to the hosted database automatically. Do not paste the local PostgreSQL password into Render; it is unrelated to the hosted database credentials.

## API endpoints

| Method | Address | Purpose |
|---|---|---|
| `GET` | `/api/books` | List books; optional `search`, `genre`, `reading_status`, `min_rating`, and `favorites_only` filters. |
| `POST` | `/api/books` | Add a book. |
| `GET` | `/api/books/{id}` | Get one book. |
| `PUT` | `/api/books/{id}` | Replace a book's details. |
| `DELETE` | `/api/books/{id}` | Delete a book. |
| `PATCH` | `/api/books/{id}/favorite` | Toggle a book's favourite flag. |
| `PATCH` | `/api/books/{id}/progress?pages_read=25` | Save reading progress and update reading status. |
| `GET` | `/api/catalog/books/lookup?title=...&author=...` | Search public catalogue records with exact title/author matching. |
| `GET` | `/api/catalog/books/lookup/work?work_id=OL...W` | Fetch the selected catalogue work's description and cover. |
| `GET` | `/api/auth/session` | Check whether the browser is signed in. |
| `POST` | `/api/auth/login` | Sign in with the shared owner password. |
| `POST` | `/api/auth/logout` | Sign out and clear the session cookie. |
| `GET` | `/health` | Check whether the API is responding. |

Ratings are numbers from **1 to 5**. The summary and genre are required; cover, review, publication year, and page count are optional. If a total page count is entered, pages read cannot exceed it.

## Troubleshooting

- **Database connection error:** Confirm PostgreSQL is running, the `booklist` database exists, and the username/password in `backend/.env` are correct.
- **Website says it cannot reach the API:** Start the backend and check that `frontend/.env` points to `http://127.0.0.1:8001`.
- **Book lookup is unavailable:** Check your internet connection and try again. Catalogue lookup is optional; book details can still be entered manually.
- **Port already in use:** Stop the other program using that port, or configure a different port and update the frontend API URL/CORS settings to match.

Profile settings are stored in the browser and are not part of the shared library account. The hosted Blueprint enables HTTPS-only session cookies and requires authentication for book and catalogue API routes. Free Render services are intended for learning and demos, not production workloads.
