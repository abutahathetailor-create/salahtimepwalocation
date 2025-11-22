// config.js - Configuration for Weather API integration

// Weather API Configuration
const WEATHER_CONFIG = {
    // OpenWeatherMap API Key - Will be set during deployment
    API_KEY: 'YOUR_API_KEY_HERE',
    
    // API Endpoints
    BASE_URL: 'https://api.openweathermap.org/data/2.5/weather',
    
    // Cache settings
    CACHE_KEY: 'salahApp_weatherData',
    CACHE_EXPIRY: 30 * 60 * 1000, // 30 minutes
    
    // Retry settings
    MAX_RETRIES: 2,
    RETRY_DELAY: 1000,
    
    // Feature flags
    ENABLED: true,
    SHOW_DESCRIPTION: true,
    ANIMATE_ICONS: true
};

// Environment-based API key setup
function setupApiKey() {
    // For GitHub Pages deployment - set this in repository secrets
    if (window.WEATHER_API_KEY) {
        WEATHER_CONFIG.API_KEY = window.WEATHER_API_KEY;
    }
    
    // For local development - use environment variable or prompt
    if (WEATHER_CONFIG.API_KEY === 'YOUR_API_KEY_HERE') {
        console.warn('Weather API key not set. Weather features will be disabled.');
        WEATHER_CONFIG.ENABLED = false;
    }
}

// Coordinate extraction from existing app
function getAppCoordinates() {
    // Method 1: Check if app exposes coordinates globally
    if (window.appState && window.appState.coordinates) {
        return window.appState.coordinates;
    }
    
    // Method 2: Check if prayer times calculation has location
    if (window.prayerTimes && window.prayerTimes.location) {
        return {
            latitude: window.prayerTimes.location.lat,
            longitude: window.prayerTimes.location.lng
        };
    }
    
    // Method 3: Extract from location display element
    const locationElement = document.querySelector('.location-display');
    if (locationElement) {
        const locationText = locationElement.textContent;
        // Try to extract coordinates from text if available
        const coords = extractCoordinatesFromText(locationText);
        if (coords) return coords;
    }
    
    // Method 4: Check localStorage (if your app stores location there)
    const storedLocation = localStorage.getItem('userLocation');
    if (storedLocation) {
        try {
            const location = JSON.parse(storedLocation);
            if (location.lat && location.lng) {
                return {
                    latitude: location.lat,
                    longitude: location.lng
                };
            }
        } catch (e) {
            console.warn('Failed to parse stored location:', e);
        }
    }
    
    return null;
}

function extractCoordinatesFromText(locationText) {
    // Simple coordinate extraction from text
    // This might need adjustment based on your location format
    const coordMatch = locationText.match(/(-?\d+\.\d+).*?(-?\d+\.\d+)/);
    if (coordMatch) {
        return {
            latitude: parseFloat(coordMatch[1]),
            longitude: parseFloat(coordMatch[2])
        };
    }
    return null;
}

// Weather condition mapping for better display
const WEATHER_CONDITIONS = {
    // Clear
    'clear': { description: 'Clear', emoji: '☀️' },
    'sunny': { description: 'Sunny', emoji: '☀️' },
    
    // Clouds
    'clouds': { description: 'Cloudy', emoji: '☁️' },
    'overcast': { description: 'Overcast', emoji: '☁️' },
    'partly cloudy': { description: 'Partly Cloudy', emoji: '⛅' },
    
    // Rain
    'rain': { description: 'Rainy', emoji: '🌧️' },
    'drizzle': { description: 'Drizzle', emoji: '🌦️' },
    'shower': { description: 'Showers', emoji: '🌦️' },
    
    // Storm
    'thunderstorm': { description: 'Thunderstorm', emoji: '⛈️' },
    
    // Snow
    'snow': { description: 'Snowy', emoji: '❄️' },
    
    // Atmosphere
    'mist': { description: 'Misty', emoji: '🌫️' },
    'fog': { description: 'Foggy', emoji: '🌫️' },
    'haze': { description: 'Hazy', emoji: '🌫️' }
};

// Utility functions
function formatTemperature(temp, unit = 'celsius') {
    if (unit === 'fahrenheit') {
        return `${Math.round((temp * 9/5) + 32)}°F`;
    }
    return `${Math.round(temp)}°C`;
}

function capitalizeWords(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase());
}

// Export for use in weather.js
window.WEATHER_CONFIG = WEATHER_CONFIG;
window.getAppCoordinates = getAppCoordinates;
window.formatTemperature = formatTemperature;
window.capitalizeWords = capitalizeWords;

// Initialize configuration
setupApiKey();
