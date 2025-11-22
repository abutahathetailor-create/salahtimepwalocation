// weather.js - Weather functionality for Prayer Times App
class WeatherManager {
    constructor() {
        this.apiKey = 'YOUR_OPENWEATHER_API_KEY'; // Will be set via environment
        this.baseUrl = 'https://api.openweathermap.org/data/2.5/weather';
        this.cacheKey = 'salahApp_weatherData';
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
        
        this.init();
    }

    init() {
        // Wait for app to initialize then add weather widget
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupWeather());
        } else {
            this.setupWeather();
        }
    }

    setupWeather() {
        // Create weather widget in header
        this.createWeatherWidget();
        
        // Try to get weather when location is available
        this.waitForLocation().then(coords => {
            this.fetchWeatherData(coords.latitude, coords.longitude);
        }).catch(error => {
            console.log('Weather: Location not available', error);
        });
    }

    createWeatherWidget() {
        // Find header location element to insert weather next to it
        const locationElement = document.querySelector('.location-display'); // Adjust selector based on your actual HTML
        
        if (locationElement) {
            const weatherWidget = document.createElement('div');
            weatherWidget.className = 'weather-widget';
            weatherWidget.innerHTML = `
                <div class="weather-loading">Loading weather...</div>
                <div class="weather-content hidden">
                    <span class="weather-icon">🌤️</span>
                    <span class="weather-temp">--°C</span>
                    <span class="weather-desc">--</span>
                </div>
                <div class="weather-error hidden">Weather unavailable</div>
            `;
            
            // Insert after location element
            locationElement.parentNode.insertBefore(weatherWidget, locationElement.nextSibling);
            
            this.weatherElement = weatherWidget;
        }
    }

    waitForLocation() {
        return new Promise((resolve, reject) => {
            // Check if location already exists in app
            const existingCoords = this.getExistingCoordinates();
            if (existingCoords) {
                resolve(existingCoords);
                return;
            }

            // Wait for location to be set (you might need to adjust this based on your app)
            let attempts = 0;
            const checkInterval = setInterval(() => {
                const coords = this.getExistingCoordinates();
                if (coords) {
                    clearInterval(checkInterval);
                    resolve(coords);
                } else if (attempts++ > 10) { // 10 attempts ~ 5 seconds
                    clearInterval(checkInterval);
                    reject(new Error('Location timeout'));
                }
            }, 500);
        });
    }

    getExistingCoordinates() {
        // This function should extract coordinates from your existing app
        // You'll need to adjust this based on how your app stores location data
        if (window.appLocation && window.appLocation.lat && window.appLocation.lng) {
            return {
                latitude: window.appLocation.lat,
                longitude: window.appLocation.lng
            };
        }
        
        // Alternative: Get from localStorage or other app storage
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
                return null;
            }
        }
        
        return null;
    }

    async fetchWeatherData(lat, lon) {
        // Check cache first
        const cachedData = this.getCachedWeather();
        if (cachedData && this.isCacheValid(cachedData)) {
            this.displayWeather(cachedData.data);
            return;
        }

        try {
            this.showLoading();
            
            const response = await fetch(
                `${this.baseUrl}?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
            );
            
            if (!response.ok) throw new Error('Weather API error');
            
            const data = await response.json();
            this.cacheWeather(data);
            this.displayWeather(data);
            
        } catch (error) {
            console.error('Weather fetch error:', error);
            this.showError();
            
            // Try to use cached data even if expired
            const cachedData = this.getCachedWeather();
            if (cachedData) {
                this.displayWeather(cachedData.data);
            }
        }
    }

    displayWeather(data) {
        if (!this.weatherElement) return;
        
        const temp = Math.round(data.main.temp);
        const description = data.weather[0].description;
        const iconCode = data.weather[0].icon;
        
        const tempElement = this.weatherElement.querySelector('.weather-temp');
        const descElement = this.weatherElement.querySelector('.weather-desc');
        const iconElement = this.weatherElement.querySelector('.weather-icon');
        
        if (tempElement) tempElement.textContent = `${temp}°C`;
        if (descElement) descElement.textContent = description;
        if (iconElement) iconElement.textContent = this.getWeatherIcon(iconCode);
        
        this.showWeatherContent();
    }

    getWeatherIcon(iconCode) {
        const iconMap = {
            '01d': '☀️', '01n': '🌙',
            '02d': '⛅', '02n': '☁️',
            '03d': '☁️', '03n': '☁️',
            '04d': '☁️', '04n': '☁️',
            '09d': '🌧️', '09n': '🌧️',
            '10d': '🌦️', '10n': '🌦️',
            '11d': '⛈️', '11n': '⛈️',
            '13d': '❄️', '13n': '❄️',
            '50d': '🌫️', '50n': '🌫️'
        };
        return iconMap[iconCode] || '🌤️';
    }

    showLoading() {
        this.hideAllWeatherStates();
        const loading = this.weatherElement.querySelector('.weather-loading');
        if (loading) loading.classList.remove('hidden');
    }

    showWeatherContent() {
        this.hideAllWeatherStates();
        const content = this.weatherElement.querySelector('.weather-content');
        if (content) content.classList.remove('hidden');
    }

    showError() {
        this.hideAllWeatherStates();
        const error = this.weatherElement.querySelector('.weather-error');
        if (error) error.classList.remove('hidden');
    }

    hideAllWeatherStates() {
        const states = this.weatherElement.querySelectorAll('.weather-loading, .weather-content, .weather-error');
        states.forEach(state => state.classList.add('hidden'));
    }

    cacheWeather(data) {
        const cacheData = {
            timestamp: Date.now(),
            data: data
        };
        localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
    }

    getCachedWeather() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            return cached ? JSON.parse(cached) : null;
        } catch (e) {
            return null;
        }
    }

    isCacheValid(cachedData) {
        return Date.now() - cachedData.timestamp < this.cacheExpiry;
    }
}

// Initialize weather manager when script loads
const weatherManager = new WeatherManager();

// Export for potential use in main app
window.weatherManager = weatherManager;
