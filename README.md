# Resident Live Chat

A simple, real-time chat application for residents of a building complex. Built with **Angular 19 (Zoneless)** and **Node.js (WebSocket)**.

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

### 2. Server Setup (Backend)
Navigate to the `server` directory and install dependencies:
```bash
cd server
npm install
```
Create a `.env` file in the `server` root if you want to customize the port (defaults to 3001).

Start the server:
```bash
npm start
```

### 3. Client Setup (Frontend)
Navigate to the `client` directory and install dependencies:
```bash
cd client
npm install
```
Start the Angular development server:
```bash
npm start
```
The app will be available at `http://localhost:4200`.

## 🛠️ Features
- **Real-time Messaging**: Instant broadcast across all connected clients.
- **Zoneless Angular**: High-performance change detection.
- **Responsive UI**: Mobile-friendly design with Tailwind CSS.
- **In-Memory Storage**: Zero-database setup; messages disappear on server restart.
- **Security Basics**: 
  - origin validation
  - Rate limiting (30 messages per 10s window)
  - Input sanitization (XSS protection)
  - WebSocket payload size limits (16KB)

## 🌐 Hosting on Render (Free Tier)

This project is configured for **Zero-Touch Deployment** on Render using the included `render.yaml` (Blueprints).

### 1. Simple Deployment
1. Push your code to a GitHub repository.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** and select **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically detect the `render.yaml` and set up both the **API (Backend)** and **UI (Frontend)**.

### 2. Manual Configuration (Alternative)
- **Backend (Web Service)**:
  - Root Directory: `server`
  - Build Command: `npm install`
  - Start Command: `node server.js`
  - Add Environment Variable: `CLIENT_ORIGIN_URL` (set to your frontend URL).
- **Frontend (Static Site)**:
  - Root Directory: `client`
  - Build Command: `npm install && WSS_URL=$(echo $BACKEND_URL | sed 's/http/ws/') && sed -i "s|ws://localhost:3005|$WSS_URL|g" src/environments/environment.ts && npm run build`
  - Publish Directory: `dist/client/browser`
  - Add Environment Variable: `BACKEND_URL` (set to your backend Web Service URL).
