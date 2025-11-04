# Procurement Portal

A Next.js web application for browsing and viewing Portuguese public procurement announcements connected to an Azure PostgreSQL database.

## Features

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Azure PostgreSQL
- **ORM**: Prisma
- **Icons**: Lucide React

## Prerequisites

Before running this application, make sure you have:

- Node.js 18+ installed
- Access to the Azure PostgreSQL database
- Environment variables configured (see .env file)

## Installation & Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   Make sure your `.env` file contains the correct DATABASE_URL for your Azure PostgreSQL connection.

3. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

## Running the Application
```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── procurement/       # Procurement pages
│   └── page.tsx          # Home page
├── components/            # Reusable UI components
├── lib/                   # Utility functions and database
├── prisma/               # Database schema and migrations
├── public/               # Static assets
└── styles/               # Global styles
```