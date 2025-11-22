class WeatherService {
    constructor() {
        this.cacheKey = 'weatherData';
        this.cacheDuration = 30 * 60 * 1000; // 30 minutes
    }

    async getWeather(lat, lon) {
        // Check cache first
        const cached = this.getCachedWeather(lat, lon);
        if (cached) {
            console.log('Using cached weather data');
            return cached;
        }

        try {
            console.log('Fetching fresh weather data for:', lat, lon);
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
            console.log('Weather data cached');
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
        this.maxAttempts = 30; // More attempts for slower loading
        this.attempts = 0;
    }

    init() {
        console.log('Initializing weather widget...');
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

        // Insert after location element in header
        const locationEl = document.querySelector('.location');
        if (locationEl && locationEl.parentNode) {
            locationEl.parentNode.insertBefore(this.widget, locationEl.nextSibling);
            console.log('Weather widget placed after location');
        } else {
            console.warn('Location element not found for widget placement');
        }
    }

    waitForLocation() {
        this.attempts++;
        console.log(`Location check attempt ${this.attempts}`);
        
        const coords = this.getCurrentCoords();
        
        if (coords && coords.lat && coords.lon) {
            console.log('Location coordinates found:', coords);
            this.tryGetWeather(coords);
        } else if (this.attempts < this.maxAttempts) {
            setTimeout(() => this.waitForLocation(), 1000);
        } else {
            console.warn('Location not available after max attempts, using default Jubail coordinates');
            // Use Jubail, Saudi Arabia coordinates as fallback
            this.tryGetWeather({ lat: 27.004, lon: 49.646 });
        }
    }

    getCurrentCoords() {
        // Method 1: Check localStorage for coordinates from your main app
        try {
            const userLocation = localStorage.getItem('userLocation');
            if (userLocation) {
                const location = JSON.parse(userLocation);
                console.log('Found location in localStorage:', location);
                if (location.latitude && location.longitude) {
                    return {
                        lat: location.latitude,
                        lon: location.longitude
                    };
                }
            }
        } catch (e) {
            console.warn('Error reading location from localStorage:', e);
        }

        // Method 2: Check if coordinates are in URL parameters (common in location apps)
        const urlParams = new URLSearchParams(window.location.search);
        const lat = urlParams.get('lat');
        const lon = urlParams.get('lon');
        if (lat && lon) {
            console.log('Found coordinates in URL parameters');
            return {
                lat: parseFloat(lat),
                lon: parseFloat(lon)
            };
        }

        // Method 3: Check window object for any location data
        if (window.currentLocation) {
            console.log('Found location in window.currentLocation:', window.currentLocation);
            return window.currentLocation;
        }

        // Method 4: Check for any global variables that might contain location
        for (let key in window) {
            if (key.toLowerCase().includes('location') && window[key] && 
                typeof window[key] === 'object' && window[key].lat) {
                console.log('Found location in window.' + key, window[key]);
                return window[key];
            }
        }

        console.log('No location coordinates found yet');
        return null;
    }

    async tryGetWeather(coords) {
        console.log('Fetching weather for coordinates:', coords);
        
        try {
            const weather = await this.weatherService.getWeather(coords.lat, coords.lon);
            if (weather) {
                console.log('Weather data received:', weather);
                this.updateDisplay(weather);
            } else {
                console.warn('No weather data received');
                this.showError('Weather unavailable');
            }
        } catch (error) {
            console.error('Weather fetch error:', error);
            this.showError('Weather service error');
        }
    }

    updateDisplay(weather) {
        if (!this.widget) {
            console.error('Weather widget not found');
            return;
        }

        this.widget.classList.remove('weather-loading', 'weather-error');
        
        const icon = this.widget.querySelector('.weather-icon');
        const temp = this.widget.querySelector('.weather-temp');
        const condition = this.widget.querySelector('.weather-condition');

        if (icon) icon.className = `weather-icon ${weather.condition}`;
        if (temp) temp.textContent = `${weather.temperature}°C`;
        if (condition) condition.textContent = this.formatCondition(weather.condition);
        
        console.log('Weather display updated successfully');
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
        
        console.log('Weather error displayed:', message);
    }
}

// Initialize weather when everything is ready
function initializeWeather() {
    console.log('Starting weather initialization...');
    
    // Wait a bit longer to ensure all other scripts are loaded
    setTimeout(() => {
        const weatherUI = new WeatherUI();
        weatherUI.init();
    }, 2000);
}

// Multiple initialization methods for maximum compatibility
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWeather);
} else {
    // If DOM is already loaded, initialize immediately
    initializeWeather();
}

// Also initialize when window loads completely
window.addEventListener('load', initializeWeather);

// Export for manual initialization if needed
window.WeatherUI = WeatherUI;
window.initializeWeather = initializeWeather;

console.log('Weather module loaded - waiting for location data...');
