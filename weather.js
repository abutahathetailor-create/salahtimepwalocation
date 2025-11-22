class WeatherService {
    constructor() {
        this.cacheKey = 'weatherData';
        this.cacheDuration = 30 * 60 * 1000; // 30 minutes
        this.apiKey = 'e7ce926d18854c239f0190141252211';
    }

    async getWeather(lat, lon) {
        // Check cache first
        const cached = this.getCachedWeather(lat, lon);
        if (cached) {
            console.log('Using cached weather data');
            return cached.weather;
        }

        try {
            console.log('Fetching from WeatherAPI for:', lat, lon);
            
            // WeatherAPI.com - much better accuracy
            const response = await fetch(
                `https://api.weatherapi.com/v1/current.json?key=${this.apiKey}&q=${lat},${lon}&aqi=no`
            );
            
            if (!response.ok) throw new Error('Weather API failed');
            
            const data = await response.json();
            const weatherData = this.transformWeatherAPIData(data);
            
            // Cache the result
            this.cacheWeather(lat, lon, weatherData);
            
            return weatherData;
            
        } catch (error) {
            console.warn('WeatherAPI failed:', error);
            // Fallback to Open-Meteo
            return await this.getOpenMeteoFallback(lat, lon);
        }
    }

    transformWeatherAPIData(apiData) {
        const current = apiData.current;
        return {
            temperature: Math.round(current.temp_c),
            condition: this.mapWeatherAPICondition(current.condition.code, current.is_day),
            time: new Date().getTime()
        };
    }

    mapWeatherAPICondition(code, isDay) {
        // WeatherAPI.com condition codes - much more accurate
        const conditions = {
            // Clear
            1000: isDay ? 'sunny' : 'clear-night',
            
            // Cloudy
            1003: 'partly-cloudy', // Partly cloudy
            1006: 'cloudy', // Cloudy
            1009: 'cloudy', // Overcast
            
            // Fog
            1030: 'foggy', // Mist
            1135: 'foggy', // Fog
            1147: 'foggy', // Freezing fog
            
            // Rain
            1063: 'rainy', // Patchy rain
            1066: 'rainy', // Patchy snow
            1069: 'rainy', // Patchy sleet
            1072: 'rainy', // Patchy freezing drizzle
            1087: 'stormy', // Thundery outbreaks
            1150: 'rainy', // Patchy light drizzle
            1153: 'rainy', // Light drizzle
            1168: 'rainy', // Freezing drizzle
            1171: 'rainy', // Heavy freezing drizzle
            1180: 'rainy', // Patchy light rain
            1183: 'rainy', // Light rain
            1186: 'rainy', // Moderate rain
            1189: 'rainy', // Heavy rain
            1192: 'rainy', // Light freezing rain
            1195: 'rainy', // Heavy freezing rain
            1198: 'rainy', // Light sleet
            1201: 'rainy', // Moderate/heavy sleet
            1204: 'rainy', // Light snow
            1207: 'rainy', // Moderate/heavy snow
            1240: 'rainy', // Light rain shower
            1243: 'rainy', // Moderate/heavy rain shower
            1246: 'rainy', // Torrential rain shower
            1249: 'rainy', // Light sleet showers
            1252: 'rainy', // Moderate/heavy sleet showers
            1255: 'rainy', // Light snow showers
            1258: 'rainy', // Moderate/heavy snow showers
            1261: 'rainy', // Light showers of ice pellets
            1264: 'rainy', // Moderate/heavy showers of ice pellets
            
            // Storm
            1273: 'stormy', // Patchy light rain with thunder
            1276: 'stormy', // Moderate/heavy rain with thunder
            1279: 'stormy', // Patchy light snow with thunder
            1282: 'stormy', // Moderate/heavy snow with thunder
        };
        return conditions[code] || 'partly-cloudy';
    }

    async getOpenMeteoFallback(lat, lon) {
        // Fallback to Open-Meteo if WeatherAPI fails
        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`
            );
            
            if (!response.ok) throw new Error('Fallback API failed');
            
            const data = await response.json();
            return this.transformWeatherData(data);
        } catch (error) {
            console.warn('All weather APIs failed');
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
        // WMO Weather interpretation codes (Open-Meteo)
        const codes = {
            0: 'sunny',
            1: 'partly-cloudy', 2: 'partly-cloudy', 3: 'cloudy',
            45: 'foggy', 48: 'foggy',
            51: 'rainy', 53: 'rainy', 55: 'rainy',
            61: 'rainy', 63: 'rainy', 65: 'rainy',
            80: 'rainy', 81: 'rainy', 82: 'rainy',
            71: 'snowy', 73: 'snowy', 75: 'snowy',
            95: 'stormy', 96: 'stormy', 99: 'stormy'
        };
        return codes[code] || 'partly-cloudy';
    }

    getCachedWeather(lat, lon) {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const isExpired = Date.now() - data.time > this.cacheDuration;
            const isSameLocation = Math.abs(data.lat - lat) < 0.01 && Math.abs(data.lon - lon) < 0.01;

            if (!isExpired && isSameLocation) {
                return data;
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
        this.maxAttempts = 10;
        this.attempts = 0;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        
        if (document.querySelector('.weather-widget')) return;
        
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

        const locationEl = document.querySelector('.location');
        if (locationEl && locationEl.parentNode) {
            locationEl.parentNode.insertBefore(this.widget, locationEl.nextSibling);
        }
    }

    waitForLocation() {
        this.attempts++;
        
        const coords = this.getCurrentCoords();
        
        if (coords && coords.lat && coords.lon) {
            console.log('Location coordinates found:', coords);
            this.tryGetWeather(coords);
        } else if (this.attempts < this.maxAttempts) {
            setTimeout(() => this.waitForLocation(), 1000);
        } else {
            console.warn('Using default Jubail coordinates');
            this.tryGetWeather({ lat: 27.004, lon: 49.646 });
        }
    }

    getCurrentCoords() {
        // METHOD 1: Direct access to your locationService
        if (typeof locationService !== 'undefined' && locationService.currentLocation) {
            console.log('Found location in locationService:', locationService.currentLocation);
            return {
                lat: locationService.currentLocation.latitude,
                lon: locationService.currentLocation.longitude
            };
        }
        
        // METHOD 2: Check if location is stored in window object by your main app
        if (window.currentLocation && window.currentLocation.latitude) {
            console.log('Found location in window.currentLocation');
            return {
                lat: window.currentLocation.latitude,
                lon: window.currentLocation.longitude
            };
        }
        
        // METHOD 3: Check localStorage (your location.js uses 'salah-location-cache')
        try {
            const cachedLocation = localStorage.getItem('salah-location-cache');
            if (cachedLocation) {
                const locationData = JSON.parse(cachedLocation);
                if (locationData.location && locationData.location.latitude) {
                    console.log('Found location in localStorage cache');
                    return {
                        lat: locationData.location.latitude,
                        lon: locationData.location.longitude
                    };
                }
            }
        } catch (e) {
            console.warn('Error reading location from cache:', e);
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
            'sunny': 'Clear',
            'clear-night': 'Clear',
            'partly-cloudy': 'Partly Cloudy', 
            'cloudy': 'Cloudy',
            'rainy': 'Rainy',
            'snowy': 'Snowy',
            'stormy': 'Thunderstorm',
            'foggy': 'Foggy'
        };
        return conditions[condition] || 'Partly Cloudy';
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

// Single initialization
let weatherInitialized = false;

function initializeWeatherOnce() {
    if (weatherInitialized) return;
    weatherInitialized = true;
    
    // Remove any existing duplicate widgets
    const existingWidgets = document.querySelectorAll('.weather-widget');
    if (existingWidgets.length > 1) {
        for (let i = 1; i < existingWidgets.length; i++) {
            existingWidgets[i].remove();
        }
    }
    
    const weatherUI = new WeatherUI();
    weatherUI.init();
}

// Wait a bit longer to ensure location.js is fully loaded
setTimeout(initializeWeatherOnce, 2000);

console.log('Weather module loaded - using WeatherAPI.com');
