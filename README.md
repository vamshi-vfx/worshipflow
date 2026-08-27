# Church Lyrics OS

Premium Church Worship Lyrics & Live Presentation Platform

## Features

- Telugu, English, Hindi, and Mixed language support
- Structured lyric editor with sections and lines
- Slide-by-slide presentation mode
- Dual-screen support (Operator + TV/Projector)
- Full lyrics reading mode
- Service planning and playlist management
- Bible presentation module
- Announcement slides
- Theme customization
- Keyboard controls
- Search in Telugu, English, and Romanized text
- Favorites and recently used tracking
- Offline-friendly operation

## Tech Stack

- Next.js 16
- TypeScript
- Tailwind CSS
- Framer Motion
- Supabase
- PostgreSQL

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your Supabase credentials:
   ```bash
   cp .env.example .env.local
   ```

3. Run the database migration:
   - Open Supabase Dashboard → SQL Editor
   - Run the SQL in `database/schema.sql`

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Presentation Setup

1. Connect your TV/Projector via HDMI
2. Windows: Settings → System → Display → Extend these displays
3. Open Church Lyrics OS
4. Select a song and click "Present"
5. Click "Open Display" to open the presentation window
6. Drag the presentation window to your TV screen
7. Press F to go fullscreen

## Keyboard Shortcuts

- **Space / →** - Next slide
- **← / Backspace** - Previous slide
- **B** - Black screen
- **F** - Fullscreen
- **Esc** - Exit presentation

## License

ISC
