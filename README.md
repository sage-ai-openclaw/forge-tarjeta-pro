# Tarjeta Pro

Monitor inteligente de promociones bancarias en Paraguay.

## Features

- ✅ Database schema for banks, cards, promotions, and user preferences (US1)
- ✅ Scraper for bank promotions (US2)
- ✅ Dashboard with active promotions (US3)
- User preferences and filtered views (US4 - TODO)
- Notification system (US5 - TODO)

## Tech Stack

- **Backend:** Node.js, Express, TypeScript, SQLite
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Zustand

## Project Structure

```
tarjeta-pro/
├── backend/              # Express + TypeScript API
│   ├── src/
│   │   ├── db/          # Database setup
│   │   ├── models/      # Data models
│   │   ├── routes/      # API routes
│   │   ├── scraper/     # Bank scrapers
│   │   └── types.ts     # TypeScript types
│   └── tests/           # Backend tests
├── frontend/            # React + Vite dashboard
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── stores/      # Zustand stores
│   │   ├── api/         # API client
│   │   └── types.ts     # TypeScript types
│   └── dist/            # Production build
├── scraper/             # Standalone scraper (legacy)
└── server.js            # Legacy server entry
```

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd frontend && npm install
```

### Development

```bash
# Run both backend and frontend concurrently
npm run dev

# Or run separately:
npm run dev:backend   # Backend on port 5585
npm run dev:frontend  # Frontend on port 3000
```

### Production

```bash
# Build frontend
npm run build

# Start backend only
npm start
```

## API Endpoints

### Banks
- `GET /api/banks` - List all banks

### Cards
- `GET /api/cards` - List all cards
- `GET /api/cards?bankId={id}` - List cards by bank
- `POST /api/cards` - Create new card

### Promotions
- `GET /api/promotions` - List promotions (with filters)
  - Query params: `category`, `status`, `bankId`, `cardType`, `sortBy`, `sortOrder`, `search`
- `GET /api/promotions/search?q={query}` - Search promotions
- `GET /api/promotions/:id` - Get single promotion
- `POST /api/promotions` - Create promotion
- `DELETE /api/promotions/:id` - Delete promotion

### Categories
- `GET /api/categories` - List all unique categories

### User Preferences
- `GET /api/preferences/:userId` - Get user preferences
- `POST /api/preferences` - Create/update preferences

## Dashboard Features

The React dashboard provides:

- **Promotion Cards:** Display bank, card, discount, merchant, valid until
- **Filters:**
  - Filter by bank
  - Filter by card type (credit/debit)
  - Filter by category
  - Sort by discount percentage or expiration date
- **Search:** Full-text search across promotions
- **Responsive Design:** Works on desktop and mobile
- **Real-time Stats:** Active promotions, bank count, categories, expiring soon

## Database Schema

### Banks
- id, name, logo_url, website

### Cards
- id, bank_id, name, type (credit/debit)

### Promotions
- id, card_id, title, description, category
- discount_percentage, discount_amount, max_discount_amount
- valid_from, valid_until, days_of_week
- merchant_name, merchant_address, source_url
- status (active/expired/pending)

### User Preferences
- preferred_categories, preferred_zones
- min_discount_percentage, max_discount_amount
- notify_new_promotions, notify_expiring_soon

## License

ISC
