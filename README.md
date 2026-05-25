# Spenza Webhook Assessment

This is a simple full-stack webhook subscription app built for the code test.

## What Is Included

- Express.js backend with JWT authentication
- Local JSON persistence for users, webhook subscriptions and events
- Subscribe, list and cancel webhook subscriptions
- Incoming webhook event handler
- Callback delivery with failed-delivery retry support
- React frontend with login, signup, subscription management and event logs
- Real-time event updates using Server-Sent Events
- Node.js webhook simulator script

## Project Structure

```text
backend/     Express API
frontend/    React dashboard
simulator/   Script to send sample webhook events
```

## Run Locally

Open three terminals.

### 1. Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Backend URL: `http://localhost:4000`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

### 3. Simulator

After creating a subscription in the frontend, copy the subscription id from the displayed webhook URL:

```bash
cd simulator
npm run send -- <subscriptionId>
```

Example:

```bash
npm run send -- 6b9952e9-3a25-48b4-a14d-78b72a6782f9
```

## How To Test

1. Start backend and frontend.
2. Sign up in the frontend.
3. Create a subscription with:
   - Source URL: `https://example.com/orders`
   - Callback URL: any test receiver URL, such as a webhook.site URL.
4. Run the simulator with the subscription id.
5. Check the event log in the dashboard.
6. If callback delivery fails, use the retry button on the failed event.

## API Summary

- `POST /auth/signup`
- `POST /auth/login`
- `POST /subscriptions`
- `GET /subscriptions`
- `DELETE /subscriptions/:id`
- `POST /webhooks/:subscriptionId`
- `GET /events`
- `POST /events/:id/retry`
- `GET /events/stream`

Protected endpoints require:

```text
Authorization: Bearer <jwt>
```

## Design Choices

The assessment asks for database persistence. To keep setup simple and moderate, this project uses a local JSON file database at `backend/data/db.json`. It behaves like a small persistent datastore without requiring MongoDB or PostgreSQL installation.

Incoming webhook events are saved first, then delivered to the subscription callback URL. This keeps a record even when the callback fails. Failed events store an error message and can be retried from the dashboard.

The frontend stores the JWT in `localStorage` for simplicity. In a production app, the token storage and webhook verification would be hardened further.
