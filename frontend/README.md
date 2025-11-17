# Reinsurance Analytics Dashboard

A modern, comprehensive analytics portal for reinsurance operations built with Next.js, TypeScript, and TailwindCSS.

## Features

### 🎯 Core Functionality
- **Dashboard Overview**: KPI metrics, performance tables, and interactive charts
- **Analytics Explorer**: Flexible data grouping, comparison tools, and CSV export
- **Global Filtering**: Filter data by UY, Ext Type, Broker, Cedant, Country, Region, and Hub
- **Real-time Calculations**: Client-side KPI computation with proper formulas

### 📊 KPI Metrics
- Premium, Paid Claims, Outstanding Claims, Incurred Claims
- Expense (Acquisition), Loss Ratio %, Expense Ratio %, Combined Ratio %
- Number of Accounts, Average Max Liability

### 🎨 Design & UX
- **Modern UI**: Clean, minimalist design with bold headings
- **Dark/Light Mode**: System preference detection with manual toggle
- **Smooth Animations**: Framer Motion for elegant transitions
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Accessibility**: ARIA labels, focus rings, keyboard navigation

### 📈 Charts & Visualizations
- **Line Chart**: Premium vs Incurred Claims by UY
- **Bar Chart**: Loss Ratio by UY with color-coded performance
- **Donut Chart**: Premium distribution by Ext Type
- **Horizontal Bar**: Top 10 Cedants by Premium

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui + Radix UI
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Validation**: Zod
- **Theme**: next-themes

## Project Structure

```
src/
├── app/
│   ├── dashboard/page.tsx          # Main dashboard
│   ├── analytics/page.tsx          # Analytics explorer
│   ├── page.tsx                    # Landing page
│   └── layout.tsx                  # Root layout
├── components/
│   ├── charts/                     # Chart components
│   ├── filters/                    # Filter components
│   ├── kpi/                        # KPI components
│   ├── navigation/                 # Navigation components
│   ├── tables/                     # Table components
│   ├── theme/                      # Theme provider
│   └── ui/                         # shadcn/ui components
└── lib/
    ├── format.ts                   # Formatting utilities
    ├── kpi.ts                      # KPI calculations
    └── schema.ts                   # Zod schemas
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kuwaitre-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

## Data Format

The dashboard expects CSV data with the following columns:

- **UY**: Underwriting Year
- **Ext Type**: Extension Type
- **Broker**: Broker Name
- **Cedant**: Cedant Name
- **Org.Insured/Trty Name**: Organization/Insured/Treaty Name
- **Max Liability (FC)**: Maximum Liability in Foreign Currency
- **Gross UW Prem**: Gross Underwritten Premium
- **Gross Actual Acq.**: Gross Actual Acquisition
- **Gross paid claims**: Gross Paid Claims
- **Gross os loss**: Gross Outstanding Loss
- **Country Name**: Country Name
- **Region**: Region
- **Hub**: Hub

## KPI Formulas

- **Incurred Claims** = Paid Claims + Outstanding Claims
- **Loss Ratio %** = Incurred Claims / Premium × 100
- **Expense Ratio %** = Acquisition / Premium × 100
- **Combined Ratio %** = (Incurred Claims + Acquisition) / Premium × 100

## Features in Detail

### Dashboard
- **KPI Strip**: 10 key metrics with trend indicators
- **UY Performance Table**: Detailed breakdown by underwriting year
- **Interactive Charts**: Premium vs Incurred, Loss Ratio, Premium by Type, Top Cedants

### Analytics Explorer
- **Group By**: Analyze data by any dimension (UY, Ext Type, Broker, etc.)
- **Compare Mode**: Side-by-side comparison of up to 3 entities
- **CSV Export**: Download filtered and aggregated data
- **Flexible Filtering**: Apply multiple filters simultaneously

### Global Filters
- **Multi-select**: Choose from available options for each dimension
- **Active Filter Display**: Visual indicators for applied filters
- **Clear All**: Reset all filters with one click
- **Collapsible Interface**: Expandable filter panel

## Customization

### Adding New KPIs
1. Update the schema in `src/lib/schema.ts`
2. Add calculation logic in `src/lib/kpi.ts`
3. Update the KPI strip in `src/components/kpi/KpiCard.tsx`

### Adding New Charts
1. Create chart component in `src/components/charts/`
2. Import and use in dashboard or analytics pages
3. Follow the existing pattern with Recharts

### Styling
- Modify `tailwind.config.js` for theme customization
- Update CSS variables in `src/app/globals.css`
- Use shadcn/ui components for consistent design

## Performance

- **Client-side Calculations**: Fast KPI computation without server round-trips
- **Optimized Rendering**: React.memo and useMemo for expensive operations
- **Lazy Loading**: Charts and components load on demand
- **Responsive Images**: Optimized assets for different screen sizes

## Accessibility

- **ARIA Labels**: Screen reader support for all interactive elements
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Clear focus indicators
- **Color Contrast**: WCAG compliant color schemes
- **Semantic HTML**: Proper heading hierarchy and landmarks

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or issues, please open an issue in the repository or contact the development team.