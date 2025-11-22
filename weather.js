class WeatherService {
    constructor() {
        this.cacheKey = 'weatherData';
        this.cacheDuration = 30 * 60 * 1000; // 30 minutes
    }

    async getWeather(lat, lon) {
        // Check cache first
        const cached = this.getCachedWeather(lat, lon);
        if (cached) return cached;

        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`
            );
            
            if (!response.ok) throw new Error('Weather API failed');
            
            const data = await response.json();
            const weatherData = this.transformWeatherData(data);
            
            // Cache the result
            this.cacheWeather(lat, lon, weatherData);
            
            return weatherData;
        } catch (error) {
            console.warn('Weather API error:', error);
            return null;
        }
    }

    transformWeatherData(apiData) {
        const current = apiData.current_weather;
        return {
            temperature: Math.round(current.temperature),
            condition: this.mapWeatherCode(current.weathercode),
            time: new Date().getTime()
        };
    }

    mapWeatherCode(code) {
        // WMO Weather interpretation codes
        const codes = {
            0: 'sunny',
            1: 'partly-cloudy', 2: 'partly-cloudy', 3: 'partly-cloudy',
            45: 'foggy', 48: 'foggy',
            51: 'rainy', 53: 'rainy', 55: 'rainy',
            61: 'rainy', 63: 'rainy', 65: 'rainy',
            80: 'rainy', 81: 'rainy', 82: 'rainy',
            71: 'snowy', 73: 'snowy', 75: 'snowy',
            95: 'stormy', 96: 'stormy', 99: 'stormy'
        };
        return codes[code] || 'default';
    }

    getCachedWeather(lat, lon) {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const isExpired = Date.now() - data.time > this.cacheDuration;
            const isSameLocation = Math.abs(data.lat - lat) < 0.01 && Math.abs(data.lon - lon) < 0.01;

            if (!isExpired && isSameLocation) {
                return data.weather;
            }
        } catch (e) {
            console.warn('Weather cache error:', e);
        }
        return null;
    }

    cacheWeather(lat, lon, weatherData) {
        try {
            const cacheData = {
                lat,
                lon,
                weather: weatherData,
                time: Date.now()
            };
            localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
        } catch (e) {
            console.warn('Weather cache save error:', e);
        }
    }
}

// UI Integration
class WeatherUI {
    constructor() {
        this.weatherService = new WeatherService();
        this.widget = null;
        this.maxAttempts = 20; // Increased attempts for slower location loading
        this.attempts = 0;
    }

    init() {
        this.createWidget();
        this.waitForLocation();
    }

    createWidget() {
        this.widget = document.createElement('div');
        this.widget.className = 'weather-widget weather-loading';
        this.widget.innerHTML = `
            <div class="weather-icon default"></div>
            <div class="weather-info">
                <div class="weather-temp">--°C</div>
                <div class="weather-condition">Loading weather...</div>
            </div>
        `;

        // Insert after location element
        const locationEl = document.querySelector('.location');
        if (locationEl && locationEl.parentNode) {
            locationEl.parentNode.insertBefore(this.widget, locationEl.nextSibling);
        } else {
            // Fallback: insert in header
            const header = document.querySelector('.header');
            if (header) {
                header.appendChild(this.widget);
            }
        }
    }

    waitForLocation() {
        this.attempts++;
        
        const coords = this.getCurrentCoords();
        
        if (coords && coords.lat && coords.lon) {
            console.log('Location found:', coords);
            this.tryGetWeather();
        } else if (this.attempts < this.maxAttempts) {
            console.log(`Waiting for location... attempt ${this.attempts}`);
            setTimeout(() => this.waitForLocation(), 1000);
        } else {
            console.warn('Location not available after max attempts');
            this.showError('Weather unavailable');
        }
    }

    getCurrentCoords() {
        // Try multiple ways to get coordinates from your existing app
        
        // Method 1: Check if your app stores location in window object
        if (window.currentLocation && window.currentLocation.lat) {
            return {
                lat: window.currentLocation.lat,
                lon: window.currentLocation.lng || window.currentLocation.lon
            };
        }
        
        // Method 2: Check for appLocation (from your previous code)
        if (window.appLocation && window.appLocation.latitude) {
            return {
                lat: window.appLocation.latitude,
                lon: window.appLocation.longitude
            };
        }
        
        // Method 3: Check if location is stored in localStorage by your main app
        try {
            const storedLocation = localStorage.getItem('userLocation');
            if (storedLocation) {
                const location = JSON.parse(storedLocation);
                if (location.latitude) {
                    return {
                        lat: location.latitude,
                        lon: location.longitude
                    };
                }
            }
        } catch (e) {
            console.warn('Error reading location from storage:', e);
        }
        
        // Method 4: Try to get from your location.js module
        if (window.locationModule && window.locationModule.getCurrentLocation) {
            const location = window.locationModule.getCurrentLocation();
            if (location) return location;
        }
        
        return null;
    }

    async tryGetWeather() {
        const coords = this.getCurrentCoords();
        if (!coords) {
            this.showError('Location required');
            return;
        }

        try {
            const weather = await this.weatherService.getWeather(coords.lat, coords.lon);
            if (weather) {
                this.updateDisplay(weather);
            } else {
                this.showError('Weather unavailable');
            }
        } catch (error) {
            console.error('Weather fetch error:', error);
            this.showError('Weather service error');
        }
    }

    updateDisplay(weather) {
        if (!this.widget) return;

        this.widget.classList.remove('weather-loading', 'weather-error');
        
        const icon = this.widget.querySelector('.weather-icon');
        const temp = this.widget.querySelector('.weather-temp');
        const condition = this.widget.querySelector('.weather-condition');

        if (icon) icon.className = `weather-icon ${weather.condition}`;
        if (temp) temp.textContent = `${weather.temperature}°C`;
        if (condition) condition.textContent = this.formatCondition(weather.condition);
        
        console.log('Weather updated:', weather);
    }

    formatCondition(condition) {
        const conditions = {
            'sunny': 'Sunny',
            'partly-cloudy': 'Partly Cloudy',
            'cloudy': 'Cloudy',
            'rainy': 'Rainy',
            'snowy': 'Snowy',
            'stormy': 'Stormy',
            'foggy': 'Foggy',
            'default': 'Fair'
        };
        return conditions[condition] || 'Unknown';
    }

    showError(message) {
        if (!this.widget) return;
        
        this.widget.classList.remove('weather-loading');
        this.widget.classList.add('weather-error');
        
        const condition = this.widget.querySelector('.weather-condition');
        if (condition) {
            condition.textContent = message;
        }
    }
}

// Enhanced initialization with multiple fallbacks
function initializeWeather() {
    // Wait a bit longer to ensure other scripts are loaded
    setTimeout(() => {
        const weatherUI = new WeatherUI();
        weatherUI.init();
    }, 500);
}

// Multiple initialization methods for maximum compatibility
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWeather);
} else {
    initializeWeather();
}

// Also expose to window for manual initialization if needed
window.WeatherUI = WeatherUI;
window.initializeWeather = initializeWeather;

console.log('Weather module loaded successfully');
