# Flight Route Builder

A modern web application for finding and planning flight routes with real-time availability checking. This tool helps users discover optimal flight combinations across multiple segments with support for stopovers and different cabin classes.

## Features

- **Interactive Calendar View**
  - Visual display of flight availability across dates
  - Color-coded indicators for different cabin classes (Economy, Business, First)
  - Easy date range selection with validation
  - Support for multi-segment routes

- **Stopover Planning**
  - Add stopovers at intermediate points
  - Configure stopover duration (1-14 days)
  - Automatic connection time validation

- **Cabin Class Support**
  - Economy (Y)
  - Business (J)
  - First Class (F)
  - Real-time availability checking

- **Smart Flight Filtering**
  - Direct flight detection
  - Airline-specific fare class validation
  - Price-based filtering for Aeroplan AC-only flights
  - Automatic merging of duplicate flights

- **Route Validation**
  - Connection time validation (30 minutes to 24 hours)
  - Stopover duration validation
  - Multi-segment route compatibility checking

## Technical Stack

- React.js
- Ant Design (UI components)
- Day.js (Date handling)
- Neo4j (Database)

## Setup

1. Clone the repository:
```bash
git clone [repository-url]
cd route-builder-ac1
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with:
```
REACT_APP_API_KEY=your_api_key
```

4. Start the development server:
```bash
npm start
```

## Usage

1. Enter your API key in the application
2. Select your route segments
3. Use the calendar view to:
   - Select date ranges
   - View flight availability
   - Add stopovers if needed
4. Click "Search" to find valid flight combinations
5. Select flights from the results to build your route

## API Integration

The application integrates with a flight availability API that provides:
- Real-time flight availability
- Pricing information
- Cabin class details
- Direct flight information

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Ha Nguyen

## Acknowledgments

- Ant Design for the UI components
- Day.js for date handling
- Neo4j for the database backend
