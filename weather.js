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
            const isSameLocation = data.lat === lat && data.lon === lon;

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
    }

    init() {
        this.createWidget();
        // Wait for location to be available from main app
        setTimeout(() => this.tryGetWeather(), 1000);
    }

    createWidget() {
        this.widget = document.createElement('div');
        this.widget.className = 'weather-widget weather-loading';
        this.widget.innerHTML = `
            <div class="weather-icon default"></div>
            <div class="weather-info">
                <div class="weather-temp">--°C</div>
                <div class="weather-condition">Loading...</div>
            </div>
        `;

        // Insert after location display or in header
        const locationEl = document.querySelector('.location-display') || document.querySelector('header');
        if (locationEl) {
            locationEl.appendChild(this.widget);
        }
    }

    async tryGetWeather() {
        // Get coordinates from existing app location
        const coords = this.getCurrentCoords();
        if (!coords) {
            this.showError('Location required');
            return;
        }

        const weather = await this.weatherService.getWeather(coords.lat, coords.lon);
        if (weather) {
            this.updateDisplay(weather);
        } else {
            this.showError('Weather unavailable');
        }
    }

    getCurrentCoords() {
        // This should access your existing app's location data
        // You might need to modify this based on your current implementation
        if (window.appLocation && window.appLocation.latitude) {
            return {
                lat: window.appLocation.latitude,
                lon: window.appLocation.longitude
            };
        }
        return null;
    }

    updateDisplay(weather) {
        if (!this.widget) return;

        this.widget.classList.remove('weather-loading', 'weather-error');
        
        const icon = this.widget.querySelector('.weather-icon');
        const temp = this.widget.querySelector('.weather-temp');
        const condition = this.widget.querySelector('.weather-condition');

        icon.className = `weather-icon ${weather.condition}`;
        temp.textContent = `${weather.temperature}°C`;
        condition.textContent = this.formatCondition(weather.condition);
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const weatherUI = new WeatherUI();
    weatherUI.init();
});
