# QuickChat Phase 1 Upgrade

## Included
- Message reactions (one active emoji reaction per user per message; clicking the same emoji removes it).
- Read receipts and delivered/read timestamps on message records.
- Live typing indicators through Socket.IO.
- Existing unread counters retained and updated from incoming messages.
- Conversation message search (up to 50 matching text messages).
- Sender-only message editing and deletion (soft delete for everyone).
- Premium violet message/action styling.

## API additions
- `GET /api/messages/search/:id?q=...`
- `PATCH /api/messages/:id` with `{ "emoji": "❤️" }` to toggle a reaction.
- `PATCH /api/messages/:id` with `{ "text": "updated text" }` to edit a message (sender only).
- `DELETE /api/messages/:id` to soft-delete a message (sender only).
- Socket events: `typing`, `messageUpdated`, `messageDeleted`, `messageRead`, `messagesRead`.

## Notes
- Existing MongoDB message documents remain compatible; new fields have defaults.
- Reactions and edits require the users to be in an accepted contact relationship through the existing conversation flow.
- The frontend build could not be completed in this environment because `npm ci` timed out and Vite was unavailable. Run `npm ci` and `npm run build` in `client` before deployment.
- Run `npm install` in `server` if dependencies are not already installed, then start using the existing `npm run server` or `npm start` scripts.
