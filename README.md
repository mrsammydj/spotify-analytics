# Spotify Analytics Dashboard

A full-stack web application that leverages Spotify's API to provide in-depth analytics on your listening habits. This project uses Flask for the backend API, Spotipy for Spotify integration, and React with Chart.js for visualization.

## Features

- **Track Recently Played Songs**: View and analyze your recently played tracks
- **Visualize Top Items**: See your top tracks, artists, and genres with interactive charts
- **Playlist Analysis**: Explore the genres and listening patterns within your playlists
- **Listening Trends**: Track your listening habits over time with detailed graphs

## Tech Stack

### Backend
- **Flask**: Python web framework
- **SQLite**: Lightweight database
- **Spotipy**: Python library for the Spotify Web API

### Frontend
- **React**: JavaScript library for building user interfaces
- **Tailwind CSS**: Utility-first CSS framework
- **Chart.js**: JavaScript charting library

## Project Structure

```
spotify-analytics/
├── backend/             # Flask API
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   └── ...
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   └── ...
│   └── ...
└── ...
```

## Getting Started

See the README files in the [backend](./backend/README.md) and [frontend](./frontend/README.md) directories for detailed setup instructions.

### Quick Start

1. Clone the repository
2. Set up the backend:
   ```
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```
3. Set up the frontend:
   ```
   cd frontend
   npm install
   ```
4. Create `.env` files in both directories (see templates)
5. Start the development servers

## Deployment

This application is designed for deployment on:
- **Backend**: Railway or Render (free tier)
- **Frontend**: Vercel (free tier)

See the [Deployment Guide](./backend/README.md#deployment) for detailed instructions.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/) for providing the data
- [Spotipy](https://spotipy.readthedocs.io/) for the Python Spotify client
- [Chart.js](https://www.chartjs.org/) for visualization capabilities