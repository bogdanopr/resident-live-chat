# resident live chat

a simple real-time chat app for "residents of a building complex" built with angular 19 (zoneless) and node.js .

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


## quick start
## app is hosted on Render
NOTE: this app is hosted on Render's free tier. if the app hasn't been used in a while, the backend service will "spin down" to save resources. when you first visit the link, it may take 30-60 seconds for the server to wake up and the chat to become active.

this project is configured for zero-touch deployment on render using the included render.yaml (render blueprints) and is currently live here: 
https://res-chat-ui.onrender.com/

### if you want to test locally these are the prerequisites:
- node.js 
- npm

### server setup (backend)
navigate to the server directory and install dependencies:
```bash
cd server
npm install
```


start the server:
```bash
npm start
```

### client setup (frontend)
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




