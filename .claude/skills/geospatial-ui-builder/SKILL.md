---
name: geospatial-ui-builder
description: Build map-based UI components for drawing site polygons, placing BESS equipment, rendering clearance zones, and interacting with layouts.
---

# Geospatial UI Builder Skill

Use this skill for:
- map components
- drawing tools
- polygon editing
- equipment rendering
- drag and rotate interactions
- layers
- visual warnings

## Stack
Use:
- Next.js
- TypeScript
- Tailwind
- react-map-gl
- maplibre-gl
- Turf.js
- Zustand

## UI structure
Main layout:
- full-screen map
- left toolbar
- right engineering sidebar
- bottom status bar
- warning panel

## Required map layers
1. Base map
2. Site polygon
3. Equipment footprint
4. Clearance zone
5. Cable route
6. Access road
7. Warning overlays

## Interaction modes
- select
- draw-site
- place-equipment
- move-equipment
- rotate-equipment
- draw-cable-route
- draw-access-road

## UX rules
- Always show scale.
- Always show selected equipment dimensions.
- Always show whether data is certified or preliminary.
- Use metric units.
- Show warnings clearly.
