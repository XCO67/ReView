# ReView - Reinsurance Analytics Dashboard

A comprehensive business intelligence platform for reinsurance operations, providing real-time analytics, performance tracking, and interactive data visualization.

## Overview

ReView is a modern web application built to analyze and visualize reinsurance data across multiple dimensions including geography, time periods, business partners, and policy metrics. The platform offers intuitive dashboards, advanced filtering capabilities, and comprehensive reporting tools.

## Features

### Core Functionality
- **Interactive Dashboards** - Real-time KPI monitoring and performance metrics
- **Advanced Analytics** - Multi-dimensional data analysis with comparative insights
- **Geographic Visualization** - Interactive world map with country-level policy distribution
- **Performance Tracking** - Loss ratio analysis, combined ratios, and technical results
- **Client Management** - Broker and cedant performance analysis
- **Renewals Management** - Policy renewal tracking and pipeline management
- **Role-Based Access** - Secure user management with granular permissions

### Technical Capabilities
- Real-time data processing and aggregation
- Multi-select filtering across business dimensions
- Responsive design for desktop and mobile devices
- Secure authentication and session management
- Database-driven architecture with optimized queries

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **Charts**: Recharts, D3.js
- **UI Components**: Custom component library with Radix UI primitives

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/XCO67/ReView.git
cd ReView
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL=postgres://user:password@localhost:5432/database_name
# OR use individual variables:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kuwait_dashboard
DB_USER=dashboard_admin
DB_PASSWORD=your_password

# Application Settings
SESSION_SECRET=your-secret-key-here
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=secure_password
```

4. Start the development server:
```bash
npm run dev
```

7. Open your browser:
Navigate to `http://localhost:3000`

## Project Structure

```
ReView/
├── src/
│   ├── app/              # Next.js pages and API routes
│   ├── components/       # Reusable React components
│   ├── lib/             # Utility functions and business logic
│   └── contexts/        # React context providers
├── public/              # Static assets
└── package.json         # Dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Database Setup

The application requires a PostgreSQL database. See `DATABASE_SETUP.md` for detailed instructions on:
- Database creation
- Schema initialization
- Data import procedures
- Maintenance tasks

## Security

- Environment variables are excluded from version control
- Secure session management with HTTP-only cookies
- Role-based access control (RBAC)
- Input validation and sanitization
- SQL injection prevention through parameterized queries

## Deployment

The application can be deployed to various platforms:
- Vercel (recommended for Next.js)
- AWS, Azure, or Google Cloud
- Self-hosted servers

Refer to deployment documentation for platform-specific instructions.

## License

Proprietary software - All rights reserved

## Support

For technical support or questions, please contact the development team.
