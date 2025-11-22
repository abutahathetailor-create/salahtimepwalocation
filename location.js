// location.js - Automated Location Detection
class LocationService {
    constructor() {
        this.currentLocation = null;
        this.cacheKey = 'salah-location-cache';
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    }

    // Main function to get user location
    async getUserLocation() {
        try {
            // Check cache first
            const cached = this.getCachedLocation();
            if (cached) {
                this.currentLocation = cached;
                return cached;
            }

            // Get coordinates from browser
            const coords = await this.getCoordinates();
            
            // Reverse geocode to get city name
            const locationInfo = await this.reverseGeocode(coords);
            
            // Cache the location
            this.cacheLocation(locationInfo);
            this.currentLocation = locationInfo;
            
            return locationInfo;
            
        } catch (error) {
            console.error('Location detection failed:', error);
            return this.getFallbackLocation();
        }
    }

    // Get coordinates from browser
    getCoordinates() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                position => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                error => {
                    reject(this.handleGeolocationError(error));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        });
    }

    // Convert coordinates to city name
    async reverseGeocode(coords) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=10&addressdetails=1`
            );
            
            if (!response.ok) throw new Error('Geocoding failed');
            
            const data = await response.json();
            
            return {
                latitude: coords.latitude,
                longitude: coords.longitude,
                city: this.extractCityName(data),
                country: data.address.country,
                displayName: this.formatDisplayName(data),
                timestamp: Date.now()
            };
            
        } catch (error) {
            console.warn('Reverse geocoding failed:', error);
            // Return coordinates if city name fails
            return {
                latitude: coords.latitude,
                longitude: coords.longitude,
                city: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
                country: 'Unknown',
                displayName: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
                timestamp: Date.now()
            };
        }
    }

    // Extract city name from geocoding data
    extractCityName(data) {
        const address = data.address;
        return address.city || address.town || address.village || address.municipality || address.county || 'Unknown Location';
    }

    // Format display name
    formatDisplayName(data) {
        const address = data.address;
        const city = this.extractCityName(data);
        return address.country ? `${city}, ${address.country}` : city;
    }

    // Handle geolocation errors
    handleGeolocationError(error) {
        const errors = {
            1: 'Location access denied. Please allow location access for accurate prayer times.',
            2: 'Location unavailable. Please check your connection.',
            3: 'Location request timed out. Please try again.'
        };
        return new Error(errors[error.code] || 'Location detection failed');
    }

    // Get fallback location (Jubail)
    getFallbackLocation() {
        return {
            latitude: 27.0040,
            longitude: 49.6460,
            city: 'Jubail',
            country: 'Saudi Arabia',
            displayName: 'Jubail, Saudi Arabia',
            isFallback: true,
            timestamp: Date.now()
        };
    }

    // Cache location to localStorage
    cacheLocation(location) {
        try {
            const cacheData = {
                location: location,
                timestamp: Date.now()
            };
            localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Failed to cache location:', error);
        }
    }

    // Get cached location
    getCachedLocation() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            const isExpired = Date.now() - cacheData.timestamp > this.cacheExpiry;

            return isExpired ? null : cacheData.location;
        } catch (error) {
            console.warn('Failed to read cached location:', error);
            return null;
        }
    }

    // Clear cached location
    clearCache() {
        try {
            localStorage.removeItem(this.cacheKey);
            this.currentLocation = null;
        } catch (error) {
            console.warn('Failed to clear location cache:', error);
        }
    }

    // Manual location refresh
    async refreshLocation() {
        this.clearCache();
        return await this.getUserLocation();
    }
}

// Create global instance
const locationService = new LocationService();
