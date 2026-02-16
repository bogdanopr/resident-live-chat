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

## 🏗️ Technical Stack
- **Frontend**: Angular 19, RxJS, Tailwind CSS
- **Backend**: Node.js, Express, `ws` (WebSocket)
- **Configuration**: `dotenv` (Server), Angular Environments (Client)
