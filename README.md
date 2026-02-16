# resident live chat

a simple, real-time chat application for residents of a building complex. built with angular 19 (zoneless) and node.js (websocket).

## quick start

### 1. prerequisites
- node.js (v18 or higher recommended)
- npm

### 2. server setup (backend)
navigate to the server directory and install dependencies:
```bash
cd server
npm install
```
create a .env file in the server root if you want to customize the port (defaults to 3005).

start the server:
```bash
npm start
```

### 3. client setup (frontend)
navigate to the client directory and install dependencies:
```bash
cd client
npm install
```
start the angular development server:
```bash
npm start
```
the app will be available at http://localhost:4200.

## features
- real-time messaging: instant broadcast across all connected clients.
- zoneless angular: high-performance change detection.
- responsive ui: mobile-friendly design with tailwind css.
- in-memory storage: zero-database setup; messages disappear on server restart.
- security basics: 
  - origin validation
  - rate limiting (30 messages per 10s window)
  - input sanitization (xss protection)
  - websocket payload size limits (16kb)

## hosting on render (free tier)

this project is configured for zero-touch deployment on render using the included render.yaml (blueprints).

### 1. simple deployment
1. push your code to a github repository.
2. in the render dashboard, click new + and select blueprint.
3. connect your github repository.
4. render will automatically detect the render.yaml and set up both the api (backend) and ui (frontend).

### 2. manual configuration (alternative)
- backend (web service):
  - root directory: server
  - build command: npm install
  - start command: node server.js
  - add environment variable: client_origin_url (set to your frontend url).
- frontend (static site):
  - root directory: client
  - build command: npm install && wss_url=$(echo $backend_url | sed 's/http/ws/') && sed -i "s|ws://localhost:3005|$wss_url|g" src/environments/environment.ts && npm run build
  - publish directory: dist/client/browser
  - add environment variable: backend_url (set to your backend web service url).
