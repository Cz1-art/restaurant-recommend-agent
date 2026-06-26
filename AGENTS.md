# AGENTS.md

## Workspace Layout
- This workspace has two sibling projects, not a single root app.
- `mymenu-main/` is the WeChat Mini Program frontend.
- `smart-ordering-system/` is the Express API backend.
- The workspace root is not a git repo; check the target subdirectory before running git or package commands.

## Backend: `smart-ordering-system/`
- Use `npm install` in `smart-ordering-system/`; the lockfile is `package-lock.json`.
- Start dev server with `npm run dev`; production start is `npm start`.
- Initialize or reseed local SQLite data with `npm run init-db`.
- There are no configured test, lint, formatter, or typecheck scripts.
- API entrypoint is `app.js`; routes are mounted under `/api/*`.
- Data persistence is SQLite, despite README references to MySQL: `models/db.js` uses `better-sqlite3` and `DB_PATH`, defaulting to `./data/smart_ordering.db`.
- `.env`, `data/*.db*`, `node_modules/`, and uploaded files are local/runtime artifacts; do not commit secrets or generated runtime data.
- Auth uses JWT Bearer tokens via `middleware/auth.js`; admin-only routes require both `authMiddleware` and `adminMiddleware`.
- Default seeded admin account from `scripts/init-db.js` is `admin` / `admin123`.

## Frontend: `mymenu-main/`
- This is a WeChat Mini Program; open/import `mymenu-main/` in WeChat DevTools rather than running npm scripts.
- Page registration and tab order are controlled by `app.json`.
- API base URL is hardcoded in `utils/api.js` as `http://localhost:3000/api`.
- `utils/api.js` wraps `wx.request`, injects `Authorization: Bearer <token>`, and redirects to `/pages/login/login` on 401.
- Login state is stored with `wx.setStorageSync('token')` and `wx.setStorageSync('userInfo')`; `app.js` only restores `userInfo`/login state, not token contents.
- Admin image upload calls backend `POST /api/upload` with multipart field name `file`.

## Verification
- Backend smoke check: from `smart-ordering-system/`, run `npm run init-db`, then `npm start`, then request `GET http://localhost:3000/api/health`.
- Frontend/backend integration requires backend running on port `3000` and WeChat DevTools URL checks compatible with localhost.
