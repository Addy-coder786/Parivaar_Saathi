# Deploying ParivaarSaathi for free (Render)

One free web service runs everything: FastAPI serves the API (`/api/*`), the live WebSocket (`/ws/events`) and the
built React app from the **same URL**. So there is no CORS setup and no second host. The repository already contains
the `Dockerfile` and a Render Blueprint (`render.yaml`).

## Steps (about 10 minutes, no credit card)

1. Sign up at <https://render.com> with your GitHub account.
2. In the Render dashboard, choose **New → Blueprint** and select the `Parivaar_Saathi` repository. If the repo is
   private, allow Render's GitHub app to access it.
3. Render reads `render.yaml` and asks for **`GROQ_API_KEY`**:
   - paste your Groq key for **AI mode**, or
   - leave it empty for the deterministic **Demo mode**. The scripted demo works either way.
4. Click **Apply**. The first build takes about 5–8 minutes. It builds the frontend, installs the backend and starts it.
5. Open the URL Render shows (e.g. `https://parivaarsaathi.onrender.com`). Check:
   - `/api/health` returns `{"status":"ok"}`
   - `/api/health/llm` makes one real LLM call (AI mode only)
   - `/?intro=0#dashboard` is the admin dashboard without the intro (use it for the second demo tab)

Every `git push` to `main` redeploys automatically.

## What the free plan means for the demo

| Behaviour | Impact | What to do |
|---|---|---|
| The service **sleeps after 15 minutes without traffic** | The first visit after sleeping takes about 1 minute | Open the site 2–3 minutes before presenting, or point a free uptime monitor (e.g. UptimeRobot) at `/api/health` every 10 minutes |
| **The disk is temporary** | The SQLite demo data is rebuilt on every restart or redeploy | Nothing; the demo dataset and the 72 simulated history sessions are recreated automatically |
| 512 MB RAM, shared CPU | Plenty for this app | — |
| A single instance | Required anyway: the live-event hub is in memory | Do not scale beyond one instance |

## Optional: real WhatsApp through the deployed URL

The public HTTPS URL replaces the tunnel needed locally:

1. In Render → your service → **Environment**, add `TWILIO_AUTH_TOKEN` (from the Twilio console) and
   `PUBLIC_BASE_URL=https://<your-app>.onrender.com`.
2. In the Twilio WhatsApp Sandbox settings, set **When a message comes in** to
   `https://<your-app>.onrender.com/api/channels/whatsapp/twilio` (HTTP POST).
3. Wake the service first: Twilio gives up after 15 seconds, so a message sent while it is sleeping can fail.

## Secrets

- Secrets live only in Render's **Environment** settings. `.env` files are git-ignored and excluded from the Docker
  image (`.dockerignore`).
- Rotate any key that has been shared in chat or screenshots.

## Run the same container locally (optional, needs Docker)

```bash
docker build -t parivaarsaathi .
docker run -p 8000:8000 -e GROQ_API_KEY=your_key parivaarsaathi   # omit the key for Demo mode
# → http://localhost:8000
```
