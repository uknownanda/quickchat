# Chat App — Render backend + Vercel frontend

The `client` folder is a Vite/React frontend. The `server` folder is an Express + MongoDB + Socket.IO backend. Deploy the backend as a persistent Render Web Service so WebSocket connections remain available.

## Local development

Backend (terminal 1):
```bash
cd server
npm install
# create .env from .env.example and fill in your credentials
npm run server
```

Frontend (terminal 2):
```bash
cd client
npm install
# create .env from .env.example
npm run dev
```

Local frontend environment:
- `VITE_BACKEND_URL=http://localhost:5000`
- `VITE_SOCKET_URL=http://localhost:5000`

## Deploy backend to Render

Create **New → Web Service** and connect this GitHub repository. Configure:
- Root Directory: `server`
- Runtime: Node
- Build Command: `npm install`
- Start Command: `npm start`

Add these Render environment variables (use your own secret values):
- `MONGODB_URI`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLIENT_URL=https://chat-app-frontend-v2-three.vercel.app`

Render supplies `PORT` automatically. The server listens on `0.0.0.0` and starts Express and Socket.IO on the same HTTP server.

## Update the Vercel frontend

Keep the existing Vercel frontend project (Root Directory `client`). In its Settings → Environment Variables, set:
- `VITE_BACKEND_URL=https://YOUR-RENDER-SERVICE.onrender.com`
- `VITE_SOCKET_URL=https://YOUR-RENDER-SERVICE.onrender.com`

Use the exact Render service URL for both values, without a trailing slash, then redeploy the frontend.

## Notes

- The existing Vercel backend project is no longer needed once the Render service is working.
- Render free instances may sleep when idle; the first request after inactivity can take time to wake.
- Do not commit `.env` files. Rotate credentials that were previously committed or shared.
- `CLIENT_URL` must match the deployed frontend origin exactly.

## QuickChat privacy and messaging upgrades

- The chat sidebar now lists only users with an accepted contact invitation.
- Authenticated users can search for people by name/email, send invitations, and accept/reject incoming invitations.
- The API enforces accepted-contact checks for message history and sending; hiding a user in the UI is not the security boundary.
- The message composer includes a quick emoji picker.
- Drag a message bubble into the composer area, or use its Reply action, to quote it in a reply.
- Reply references are stored in the Message collection (`replyTo`). Existing documents remain compatible.

### New MongoDB database

Set `MONGODB_URI` in local `server/.env` and in the Render service environment to the new Atlas connection string, with `/quickchat` as the database name. The database and collections are created automatically on first write. Keep the old Atlas cluster until you have verified the new deployment.

### Frontend environment

Local `client/.env`:

```env
VITE_BACKEND_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

For Vercel, set both variables to the Render service URL (without a trailing slash), then redeploy.

### Important first-run behavior

Existing users in the new database start with no contacts. They must search for one another and accept invitations before either can start a conversation. Do not point the old production deployment at the new database until you are ready to switch.


## Usernames and authentication
- Signup requires a unique username (3–20 characters; lowercase letters, numbers, and underscores).
- Usernames are normalized to lowercase and enforced as unique by MongoDB.
- Users can sign in with either their username or email address.
- The signup page checks username availability through `/api/auth/check-username`.
- Contact discovery searches usernames and display names.
