# Tarjeta Pro

Monitor inteligente de promociones bancarias en Paraguay.

## Features

- ✅ Database schema for banks, cards, promotions, and user preferences
- Scraper for bank promotions (TODO)
- Dashboard with active promotions (TODO)
- User preferences and filtered views (TODO)
- Notification system (TODO)

## Tech Stack

- **Backend:** Node.js, Express, TypeScript, SQLite
- **Frontend:** React, TypeScript, Vite (TODO)

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

## Quick Start

```bash
npm install
npm run dev
```

Backend runs on port 5585.

## API Endpoints

- `GET /api/banks` - List banks
- `GET /api/cards` - List cards
- `POST /api/cards` - Create card
- `GET /api/promotions` - List promotions
- `POST /api/promotions` - Create promotion
- `GET /api/promotions/search?q=query` - Search promotions
