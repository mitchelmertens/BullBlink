# BullBlink - Stock Dashboard Application

A modern, real-time stock tracking dashboard built with React, Vite, and Supabase. This application allows users to monitor their stock portfolio, view real-time stock data, and stay updated with the latest stock-related news.

## Features

### Authentication
- Google OAuth integration
- Secure email/password authentication
- Account management (creation, deletion)
- Profile information display

### Stock Management
- Real-time stock tracking
- Add/remove stocks to/from portfolio
- Adjust stock quantities
- View detailed stock information:
  - Current price
  - Price changes
  - High/Low values
  - Opening and previous closing prices
  - Total value calculation

### Portfolio Analytics
- 30-day portfolio performance chart
- Real-time value updates
- Interactive data visualization
- Aggregate portfolio statistics

### News Integration
- Stock-specific news articles
- Manual news refresh functionality
- News cards with images and summaries
- Timestamp and source information

### User Interface
- Modern, responsive design
- Frosted glass effect
- Dark theme
- Interactive navigation
- Loading states and error handling
- Custom scrollbars
- Adaptive layouts

## Technical Stack

### Frontend
- React.js
- Vite
- Chart.js for data visualization
- Tailwind CSS for styling

### Backend & Authentication
- Supabase for backend services
- Real-time database functionality
- Secure authentication flow

### APIs
- Finnhub API for real-time stock data
- Polygon.io for historical stock data
- News API for stock-related news

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file with the following:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_FINNHUB_API_KEY=your_finnhub_api_key
   VITE_POLYGON_API_KEY=your_polygon_api_key
   VITE_NEWS_API_KEY=your_news_api_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## API Keys Required

- Finnhub API key for real-time stock data
- Polygon.io API key for historical data
- News API key for stock news
- Supabase project credentials

## Database Schema

### user_stocks
- user_id (foreign key to auth.users)
- stock_symbol (string)
- quantity (integer)

## Features in Detail

### Stock Dashboard
- Holdings view with real-time updates
- News feed with refresh capability
- Profile management section

### Stock Cards
- Current price display
- Price change indicators
- Quantity adjustment controls
- Detailed stock metrics

### News Section
- Stock-specific news articles
- Manual refresh functionality
- Rich media display
- Source attribution

### Profile Section
- User information display
- Sign out functionality
- Account deletion option
- Session management

## Development Notes

### News API Usage
- Currently configured with mock data to preserve API credits
- Easy toggle between mock and live data
- Instructions for enabling live news included in code

### Performance Optimizations
- Efficient data fetching
- Debounced API calls
- Optimized re-renders
- Cached responses

## Styling

The application uses a combination of custom CSS and Tailwind for styling:
- Responsive design principles
- Dark theme implementation
- Glassmorphism effects
- Custom animations
- Adaptive layouts

## Security Considerations

- Secure authentication flow
- Protected API endpoints
- Environment variable usage
- Input validation
- Error handling

## Future Enhancements

- Additional portfolio analytics
- More detailed stock information
- Enhanced news filtering
- Additional authentication methods
- Mobile application version

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - feel free to use this project for your own purposes.
