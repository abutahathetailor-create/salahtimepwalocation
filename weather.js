class WeatherService {
    constructor() {
        this.cacheKey = 'weatherData';
        this.cacheDuration = 30 * 60 * 1000; // 30 minutes
    }

    async getWeather(lat, lon) {
        // Check cache first
        const cached = this.getCachedWeather(lat, lon);
        if (cached && this.validateWeatherData(cached.weather, lat, lon)) {
            console.log('Using cached weather data');
            return cached.weather;
        }

        try {
            console.log('Fetching fresh weather data for:', lat, lon);
            
            // Try enhanced Open-Meteo first
            const weatherData = await this.tryEnhancedOpenMeteo(lat, lon);
            
            if (weatherData && this.validateWeatherData(weatherData, lat, lon)) {
                // Cache the result
                this.cacheWeather(lat, lon, weatherData);
                return weatherData;
            } else {
                // Fallback to basic Open-Meteo
                return await this.getBasicOpenMeteoWeather(lat, lon);
            }
            
        } catch (error) {
            console.warn('Weather API error:', error);
            return await this.getBasicOpenMeteoWeather(lat, lon); // Fallback
        }
    }

    async tryEnhancedOpenMeteo(lat, lon) {
        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`
            );
            
            if (response.ok) {
                const data = await response.json();
                const temp = Math.round(data.current.temperature_2m);
                
                // If temperature seems reasonable for Saudi Arabia, use it
                if (temp >= 18 && temp <= 35) {
                    return {
                        temperature: temp,
                        condition: this.mapWeatherCode(data.current.weather_code),
                        time: new Date().getTime()
                    };
                }
            }
        } catch (e) {
            console.log('Enhanced Open-Meteo failed:', e);
        }
        return null;
    }

    async getBasicOpenMeteoWeather(lat, lon) {
        // Basic fallback
        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`
            );
            
            if (!response.ok) throw new Error('Weather API failed');
            
            const data = await response.json();
            return this.transformWeatherData(data);
        } catch (error) {
            console.warn('Fallback weather API failed:', error);
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

    validateWeatherData(weatherData, lat, lon) {
        if (!weatherData) return false;
        
        // Saudi Arabia should typically be 18°C or warmer
        if (lat > 20 && lat < 30 && lon > 45 && lon < 55) {
            if (weatherData.temperature < 18) {
                console.warn('Suspicious low temperature for Saudi location:', weatherData.temperature);
                return false;
            }
        }
        
        // General temperature validation
        if (weatherData.temperature < -50 || weatherData.temperature > 60) {
            console.warn('Unrealistic temperature:', weatherData.temperature);
            return false;
        }
        
        return true;
    }

    getCachedWeather(lat, lon) {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const isExpired = Date.now() - data.time > this.cacheDuration;
            const isSameLocation = Math.abs(data.lat - lat) < 0.01 && Math.abs(data.lon - lon) < 0.01;

            if (!isExpired && isSameLocation && this.validateWeatherData(data.weather, lat, lon)) {
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

console.log('Weather module loaded - will connect to locationService');
