<p align="center">
  <img src="public/Pictures/funlish-logo.svg" alt="Funlish Logo" width="120" height="120">
</p>

<h1 align="center">Funlish</h1>

<p align="center">
  <strong>Event Management System</strong>
</p>

<p align="center">
  A modern, full-stack event management application built with Next.js and Supabase for managing teams, tracking attendance, and coordinating event participants.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#environment-variables">Environment Variables</a> •
  <a href="#database-setup">Database Setup</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#user-roles">User Roles</a>
</p>

---

## ✨ Features

### 👥 Team Management
- **Automatic Team Assignment** - Participants are randomly assigned to teams upon registration
- **Team Capacity Control** - Maximum members per team with automatic overflow handling
- **Move Participants** - Easily transfer participants between teams
- **Real-time Updates** - Auto-refresh every 2 seconds for live collaboration

### 📋 Attendance Tracking
- **Photo Capture** - Take attendance with camera photo proof
- **Geolocation** - Record location data when marking attendance
- **Date Selection** - View and manage attendance by specific dates
- **Department Filtering** - Filter attendance by department, status, or search

### 👤 User Management
- **Role-Based Access Control** - 5 distinct user roles with granular permissions
- **Session Management** - Secure session tokens with single-device login enforcement
- **Department Organization** - Organize users across 11 different departments

### 📊 Dashboard & Reports
- **Statistics Overview** - Real-time stats for teams, participants, and attendance
- **Attendance Reports** - Detailed reporting by team and individual
- **Export Capabilities** - Generate reports for analysis

### 🔧 System Features
- **Maintenance Mode** - Admin-controlled system maintenance with user notifications
- **Responsive Design** - Fully responsive UI for desktop and mobile devices
- **Dark/Light Support** - Clean, modern UI with Tailwind CSS

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | [Next.js 16](https://nextjs.org/) with App Router |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL) |
| **Authentication** | Custom auth with bcrypt password hashing |
| **State Management** | React Context API |
| **React Version** | React 19 |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.17 or later
- **npm**, **yarn**, **pnpm**, or **bun**
- **Supabase Account** (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/funlish.git
   cd funlish
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**
   
   Run the SQL schema in your Supabase SQL Editor (see [Database Setup](#database-setup))

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

6. **Open the application**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | ✅ |

> ⚠️ **Important**: Never commit your `.env.local` file to version control. It's already included in `.gitignore`.

---

## 🗄 Database Setup

### Initial Setup

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Create a new project or select an existing one
3. Navigate to **SQL Editor**
4. Run the schema file: `supabase/schema.sql`

### Database Tables

| Table | Description |
|-------|-------------|
| `users` | System users (committee members) who can login |
| `groups` | Team containers for participant assignment |
| `participants` | Event participants assigned to groups |
| `committee_members` | Master list of committee members |
| `attendance` | Attendance records with photos and location |
| `maintenance_mode` | System maintenance status |

### Seed Data

To create an initial admin user, run:
```bash
npm run setup-database
```

Or manually run `supabase/seed-admin.sql` in the SQL Editor.

---

## 📁 Project Structure

```
funlish/
├── public/
│   ├── Pictures/          # Logo and images
│   └── videos/            # Background videos
├── scripts/
│   └── setup-database.js  # Database setup script
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── dashboard/     # Protected dashboard routes
│   │   │   ├── admin/     # Admin user management
│   │   │   ├── attendance/# Attendance tracking
│   │   │   ├── profile/   # User profile
│   │   │   ├── report/    # Reports & analytics
│   │   │   └── teams/     # Team management
│   │   ├── login/         # Authentication
│   │   ├── register/      # User registration
│   │   └── maintenance/   # Maintenance mode pages
│   ├── components/        # Reusable UI components
│   ├── context/           # React Context providers
│   │   ├── AttendanceContext.tsx
│   │   ├── AuthContext.tsx
│   │   └── MaintenanceContext.tsx
│   ├── lib/               # Utility libraries
│   │   ├── storage.ts     # Storage utilities
│   │   └── supabase.ts    # Supabase client
│   └── types/             # TypeScript type definitions
└── supabase/              # Database schemas & migrations
```

---

## 👤 User Roles

The system implements 5 distinct user roles with varying permissions:

| Role | Dashboard | Attendance | Teams | User Management |
|------|-----------|------------|-------|-----------------|
| **Admin** | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Chairperson** | ✅ Full | ✅ Full | ✅ Full | ❌ None |
| **Protocol** | ✅ Full | ✅ Full | ✅ Full | ❌ None |
| **Registration Coordinator** | ✅ Full | 👁 View | ✅ Full | ❌ None |
| **Committee** | ✅ Full | 👁 View | 👁 View | ❌ None |

### Departments

Users can be assigned to one of 11 departments:
- Administrator
- PR & Communication
- Protocol & Ceremonial
- F&B
- Sponsorship & Finance
- Logistics & Operations
- Technical IT Support
- Evaluation, Research & Documentation
- Health, Safety & Welfare
- Executive
- Program & Activities

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Build production-ready application |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint for code quality |

---

## 🔒 Security Features

- **Password Hashing** - All passwords are hashed using bcrypt
- **Session Tokens** - Unique session tokens for authentication
- **Single Device Login** - Users can only be logged in on one device at a time
- **Role-Based Access** - Granular permission control per page/feature
- **Maintenance Mode** - System can be put into maintenance mode by admins

---

## 🌐 Deployment

### Deploy on Vercel (Recommended)

The easiest way to deploy Funlish is using [Vercel](https://vercel.com/):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/funlish)

1. Push your code to GitHub
2. Import your repository on Vercel
3. Add your environment variables
4. Deploy!

### Other Platforms

Funlish can also be deployed on:
- [Netlify](https://netlify.com/)
- [Railway](https://railway.app/)
- [AWS Amplify](https://aws.amazon.com/amplify/)
- Self-hosted with Docker

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Vercel](https://vercel.com/) - Deployment platform

---

<p align="center">
  Made with ❤️ for event management
</p>
