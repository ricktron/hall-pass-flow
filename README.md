
# Mr. Garnett's Bathroom Pass System

A digital hall pass tracking system for classroom use, designed for public kiosk deployment (e.g., on classroom Chromebooks).

## What It Does

This app tracks student bathroom trips by logging:
- Student name and class period
- Time out and time returned
- Destination (Bathroom, Nurse, Office, etc.)
- Duration of each trip
- Analytics for teachers to monitor patterns

## Features

- **Student Mode**: Simple sign-out interface for students
- **Teacher Dashboard**: PIN-protected analytics and management
- **Real-time Tracking**: Shows currently out students with live timers
- **Data Analytics**: Trip frequency, duration averages, and pattern analysis
- **Kiosk-Friendly**: Always returns to role selector after use

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui components  
- **Backend**: Supabase (PostgreSQL database)
- **Routing**: React Router

## Database

The app connects to Supabase and stores data in the `Hall_Passes` table with columns:
- `studentName`, `period`, `timeOut`, `timeIn`, `duration`
- `dayOfWeek`, `destination`, `earlyDismissal`, `classroom`

## Configuration

### Classroom ID
Update the classroom identifier in `src/config/classroom.ts`:
```typescript
export const CLASSROOM_ID = "B12"; // Change this for your classroom
```

### Teacher PIN
The teacher dashboard is protected by a hardcoded PIN. Check `src/components/PinEntryDialog.tsx` to modify the PIN if needed.

### Supabase Connection
Set up your Supabase project and update the connection details in `src/integrations/supabase/client.ts`.

## Development

```sh
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Deployment

Deploy using the Lovable platform or any static hosting service that supports React applications.

## Usage

1. **Students**: Walk up to the kiosk, select "Student", enter name/period/destination, and sign out
2. **Teachers**: Select "Teacher", enter PIN, access dashboard with analytics and student management
3. **Return Process**: Students can mark themselves returned, or teachers can do it from the dashboard

The app automatically returns to the role selector after each interaction, making it perfect for shared classroom use.
