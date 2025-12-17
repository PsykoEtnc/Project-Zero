# ACTING - Assistant de Convoi Tactique Intelligent Nouvelle Génération

## Overview
ACTING is a real-time military tactical convoy coordination web application designed for 7 simultaneous users with distinct roles:
- 4 convoy vehicles (CONVOY_1, CONVOY_2, CONVOY_3, CONVOY_4)
- 1 reconnaissance vehicle (RECO)
- 1 A400M aircraft (A400M)
- 1 command post (PC)

The application provides real-time position tracking, alert management, mission briefing/debriefing, and AI-powered image analysis without requiring authentication - terminals are pre-configured by role.

## Architecture

### Frontend (React + Vite)
- **Location**: `client/src/`
- **Routing**: wouter for SPA navigation
- **State Management**: React Query for server state, React Context for role management
- **Real-time**: Socket.IO client for WebSocket communication
- **Mapping**: Leaflet with OpenStreetMap tiles

### Backend (Express + TypeScript)
- **Location**: `server/`
- **API**: REST endpoints for CRUD operations
- **Real-time**: Socket.IO server for position updates and alerts
- **Database**: PostgreSQL with Drizzle ORM

### Shared
- **Location**: `shared/schema.ts`
- **Schema**: Drizzle schema definitions with Zod validation

## Key Components

### Pages
- `client/src/pages/RoleSelection.tsx` - Pre-configured terminal role selection
- `client/src/pages/Dashboard.tsx` - Main tactical interface
- `client/src/pages/BriefingPage.tsx` - Mission briefing view
- `client/src/pages/DebriefingPage.tsx` - Post-mission analysis

### Components
- `TacticalMap.tsx` - Leaflet map with vehicle markers and route display
- `AlertPanel.tsx` - Real-time alert management (Waze-style)
- `VehicleStatus.tsx` - Vehicle connection and status indicators
- `QuickAlertCreator.tsx` - One-tap alert creation
- `CameraAnalysis.tsx` - AI-powered image analysis interface
- `TopBar.tsx` - Stealth mode and emergency controls

### Hooks
- `useWebSocket.ts` - Socket.IO connection and event handling
- `useGeolocation.ts` - GPS position tracking with simulation fallback
- `useRole.ts` - Role context and permissions

## Database Schema

### Tables
- `vehicles` - Vehicle positions and status
- `alerts` - Threat/obstacle reports with AI analysis
- `missions` - Mission data with briefing/debriefing content
- `connection_logs` - Connect/disconnect events for debriefing
- `zones` - Named map sectors
- `pc_messages` - One-way PC to vehicle communications

## API Endpoints

### REST
- `GET /api/mission/current` - Get current mission
- `POST /api/mission/start` - Start mission (BRIEFING -> IN_PROGRESS)
- `POST /api/mission/complete` - Complete mission with AI debriefing
- `POST /api/analyze-image` - AI image analysis
- `GET /api/vehicles` - Get all vehicles
- `GET /api/alerts` - Get all alerts
- `POST /api/route/calculate` - Calculate route via GraphHopper

### WebSocket Events
- `join` - Register terminal with role
- `position:update` - Send position update
- `stealth:toggle` - Toggle stealth mode
- `alert:create/validate/dismiss` - Alert management
- `route:recalculate` - Request new route

## Environment Variables Required

### Secrets (Required)
- `OPENAI_API_KEY` - For AI image analysis and briefing generation
- `GRAPHHOPPER_API_KEY` - For route calculation
- `SESSION_SECRET` - Session security
- `DATABASE_URL` - PostgreSQL connection (auto-provided by Replit)

## Development

### Commands
- `npm run dev` - Start development server
- `npm run db:push` - Push schema changes to database

### Default Coordinates
Vehicles are initialized with staging coordinates in Mali region:
- Convoy vehicles: Around 17.40N, -4.18W
- RECO: 17.45N, -4.15W (ahead of convoy)
- A400M: 17.60N, -3.80W (extraction point)

## Design Guidelines
See `design_guidelines.md` for tactical military interface design specifications.

## Recent Changes
- December 17, 2025: Initial implementation of ACTING application
  - Full WebSocket real-time coordination
  - Leaflet map integration with vehicle tracking
  - AI-powered image analysis
  - Mission briefing/debriefing system
  - Emergency controls (stealth mode, data wipe)
