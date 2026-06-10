# The Room

A social event app for builders — create rooms, share join links/QR codes, and connect with attendees through lightweight mini profiles.

Built with **React Native Expo SDK 54**, **Expo Router**, and **Supabase**.

> **Note:** This project uses SDK 54 so it works with the App Store version of Expo Go. SDK 56 is not yet available on the App Store.

## Features (MVP)

- Sign up / sign in with Supabase Auth
- Create a room (title, description, date/time, location, cover, privacy)
- Auto-generated invite code + shareable link + QR code
- Join via link or code
- Mini profile setup when joining (name, avatar, headline, building, looking for, can help with, LinkedIn)
- Room detail with attendee list and profile cards

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL in [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor
3. Enable **Email** auth under Authentication → Providers
4. Create a Storage bucket named `room-assets` (public read access)
5. Copy env vars:

```bash
cp .env.example .env
```

Fill in:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_APP_URL=theroom://join
```

### 3. Run the app

```bash
npx expo start
```

Press `i` for iOS simulator, `a` for Android, or scan the QR with Expo Go.

## Test the full flow

1. **Host:** Sign up → Create Room → share the invite code/link from the preview screen
2. **Attendee:** Sign up on another device/account → open `theroom://join/CODE` or navigate to Join Room
3. **Attendee:** Complete mini profile → land in the room
4. **Host:** Open the room → see the attendee in the people list

### Deep links

Join URLs follow this pattern:

```
theroom://join/ABC123
```

In Expo Go during development, you can also navigate manually to `/join/ABC123` from the dev menu or by typing the route.

## Project structure

```
app/
  (auth)/login.tsx          # Auth screen
  (main)/index.tsx          # Home — Create Room + My Rooms
  (main)/create-room.tsx    # Create Room form
  (main)/room/[id].tsx      # Room Detail
  (main)/room/preview/[id]  # Share link + QR
  (main)/room/people/[id]   # People in Room
  (main)/profile-setup/     # Mini profile on join
  join/[code].tsx           # Join Room entry
lib/
  supabase.ts               # Supabase client
  auth.tsx                  # Auth context
  api/rooms.ts              # Room CRUD
components/                 # UI components
supabase/schema.sql         # Database schema + RLS
```

## Design

Luma/Partiful-inspired: soft gradients, rounded cards, event-style hero headers, avatar stacks, minimal forms.

## Not in MVP

- AI matching
- Chat
- Endorsements
- Real-time updates

## License

MIT
