# ACTING - Design Guidelines
## Assistant de Convoi Tactique Intelligent Nouvelle Génération

### Design Approach
**System-Based with Tactical Overlay**: Carbon Design System foundation adapted for military/tactical context. Prioritizes clarity, rapid information processing, and operational efficiency over aesthetic appeal. Every element serves a functional purpose for mission-critical decision-making.

### Core Design Principles
1. **Map-First Architecture**: Cartographic display dominates viewport with minimal UI chrome
2. **Information Hierarchy**: Critical alerts and position data always visible
3. **Rapid Interaction**: Large touch targets for rugged tablet operation
4. **Role-Adaptive Interface**: UI adjusts based on user role (Vehicle/RECO/A400M/PC)
5. **Tactical Clarity**: High contrast, no decorative elements, military symbology integration

---

## Typography System

**Primary Font**: Inter or Roboto (via Google Fonts CDN)
- **Display/Headers**: 600 weight, uppercase for section titles (e.g., "CARTE TACTIQUE", "ALERTES")
- **Body Text**: 400 weight, 16px base size for readability on tactical displays
- **Alert Text**: 700 weight, 18px for critical notifications
- **Map Labels**: 500 weight, 14px with tight letter-spacing
- **Timestamps/Metadata**: 400 weight, 13px, slight opacity reduction

**Secondary Font**: Roboto Mono (for coordinates, technical data)
- Grid references, GPS coordinates, vehicle IDs
- 14px, 500 weight

---

## Layout System

**Spacing Primitives**: Tailwind units of **2, 4, 8, 16**
- `p-2` / `m-2`: Tight spacing within components (8px)
- `p-4` / `gap-4`: Standard component padding (16px)  
- `p-8` / `my-8`: Section separation (32px)
- `p-16`: Large container padding (64px - rare, PC view only)

**Grid Structure**:
```
Desktop (PC View):
- Sidebar: 280px fixed (left) - Navigation + Quick Actions
- Map Area: flex-1 (central dominant)
- Alert Panel: 320px fixed (right, collapsible)

Mobile/Tablet (Vehicle View):
- Full-screen map with floating overlay controls
- Bottom sheet for alerts/actions (swipe-up)
- Compact top bar (40px height)
```

**Viewport Strategy**:
- Map interface: 100vh - [header height] for immersive tactical view
- Modal overlays (briefing/debriefing): 90vh max-height, scrollable content
- Alert notifications: Fixed positioning, no viewport constraints

---

## Component Library

### Navigation & Controls

**Top Bar (Mobile/Tablet)**:
- Height: 48px, fixed position
- Role indicator badge (left): "VÉH 1" / "RECO" / "PC"
- Emergency wipe button (right): Prominent, red accent
- Connection status indicator: GPS/Network icons with signal strength

**Sidebar (PC Desktop)**:
- Vertical navigation stack
- Icons: Heroicons (via CDN) - map-pin, exclamation-triangle, camera, document-text
- Active state: Full-width highlight bar
- Role switcher at top (for demonstration purposes)

**Floating Action Buttons (Map View)**:
- Circular, 56px diameter
- Bottom-right corner stack: Alert creation, Camera capture, Stealth mode toggle
- Shadow elevation for prominence over map
- Icons only, no labels (Heroicons: plus, camera, eye-slash)

### Map Components

**Leaflet Integration**:
- Base layer: OpenStreetMap standard tiles
- Custom markers: Military symbology (NATO APP-6) via SVG sprites
- Vehicle markers: Different icons for PPLOG (convoy), VBL RECO, A400M
- Alert markers: Color-coded by severity (use icon variations, not color fills)
- Zone overlays: Named grid squares with subtle borders

**Map Controls**:
- Zoom: Bottom-left, minimal style
- Layer switcher: Satellite/Terrain toggle
- Current location centering (for vehicles)
- Route display: Dashed line with waypoint markers

**Range Indicators**:
- Vehicle view: 300m radius circle overlay (semi-transparent)
- PC view: Unrestricted pan/zoom with scale bar

### Alert System

**Alert Creation Modal**:
- Waze-style quick selection grid (3x2 layout)
- Categories: Obstacle, Hostile, IED Suspect, Vehicle Breakdown, Civilian Traffic, Other
- Each category: Icon + Label, large tap target (120px height)
- Optional photo attachment from camera
- Submit button: Full-width, prominent

**Alert List (PC View)**:
- Compact card design: 280px width
- Header: Alert type icon + Timestamp + Source (VÉH X)
- Body: Brief description (max 2 lines)
- Footer: Validation controls (Confirm/Dismiss) for PC only
- Unvalidated alerts: Visual indicator (border treatment)

**Alert Notifications (In-Map)**:
- Toast-style pop-ups, 4s duration
- Top-center positioning
- Icon + "VÉH 2: Obstacle signalé - Zone Alpha"

### Camera/Analysis Interface

**Capture View**:
- Full-screen camera preview
- Shutter button: Bottom-center, 72px circle
- Flash toggle, switch camera icons (top corners)
- Captured image preview: Thumbnail with "Analyze" action

**Analysis Results**:
- Modal overlay on map
- Image thumbnail: 300px width, aspect-ratio preserved
- AI analysis text: Card format, 400px max-width
- Confidence indicators: Progress bar style
- "Send to PC" button if from vehicle

### Briefing/Debriefing

**Full-Page Document Layout**:
- Max-width: 800px, centered
- Structured sections with clear headers
- Metadata header: Mission date/time, participants, objective
- Content sections: Typography hierarchy (H2, body paragraphs, lists)
- Print-friendly formatting
- Export button (PDF): Fixed bottom-right

**Debriefing Specifics**:
- Timeline visualization: Vertical line with event markers
- Statistics cards: Grid layout (2x2), key metrics (distance, alerts, connection losses)
- Connection loss map overlay: Highlighted zones

### Data Display

**Vehicle Status Cards (PC View)**:
- Horizontal layout: 5 cards (4 convoy + 1 RECO) + A400M indicator
- Each card: 180px width
- Contents: Vehicle ID, Last position update timestamp, Connection status icon, Quick actions
- A400M: Floating indicator with altitude/speed data

**Route Information Panel**:
- Collapsible sidebar section
- Total distance, ETA to extraction
- Waypoint list with distances
- Deviation alerts if convoy off-route
- "Recalculate Route" button

### Emergency Controls

**Stealth Mode Toggle**:
- Switch component with clear on/off states
- Warning text: "Position broadcasting disabled"
- Visual indicator on map (vehicle marker changes)

**Emergency Wipe Button**:
- Always visible in top bar
- Confirmation dialog: Two-step process
- Warning iconography and text

---

## Animations & Interactions

**Minimal Motion Philosophy** - Only functional animations:

1. **Map Updates**: Marker position transitions (0.3s ease-out) for smooth vehicle movement
2. **Alert Appearance**: Slide-in from right (0.2s) for new alerts in panel
3. **Modal Overlays**: Fade + scale (0.25s) for briefing/camera views
4. **Button States**: Instant active state (scale 0.98), no hover effects for touch
5. **Connection Status**: Pulse animation on reconnection only

**NO**:
- Decorative parallax
- Auto-playing carousels
- Transition delays
- Elaborate page transitions

---

## Responsive Breakpoints

- **Mobile/Tablet** (≤ 1024px): Full-screen map, floating controls, bottom sheets
- **Desktop PC** (> 1024px): Sidebar + Map + Alert panel three-column layout
- **Large Display** (> 1920px): Max-width constraints on panels (not map)

---

## Accessibility

- Touch targets: Minimum 44px × 44px (48px preferred)
- Keyboard navigation: Full support for PC users
- Screen reader labels: All icons have aria-labels
- High contrast mode compatible: No reliance on color alone for critical info
- Focus indicators: 2px solid outline on all interactive elements

---

## Images

**No hero imagery** - This is a functional tactical application, not a marketing site.

**Operational Images**:
1. **Vehicle symbology**: Use NATO APP-6 standard SVG icons for map markers (PPLOG, VBL, aircraft)
2. **Camera captures**: User-generated photos for AI analysis (dynamic content)
3. **Map tiles**: OpenStreetMap raster tiles loaded via Leaflet
4. **Background patterns**: Subtle topographic contour patterns for empty states (optional, very subtle)

All graphical assets loaded from CDN or generated dynamically - no static hero sections.