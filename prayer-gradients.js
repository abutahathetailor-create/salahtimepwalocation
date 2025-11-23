// Prayer Time Gradient System for Weather Widget Only
class PrayerGradientManager {
    constructor() {
        this.currentGradient = null;
        this.prayerTimes = null;
        this.weatherWidget = null;
    }

    init() {
        console.log('Initializing prayer gradients for weather widget...');
        this.waitForWeatherWidget();
    }

    waitForWeatherWidget() {
        const maxAttempts = 20;
        let attempts = 0;

        const checkWidget = () => {
            attempts++;
            this.weatherWidget = document.querySelector('.weather-widget');
            
            if (this.weatherWidget) {
                console.log('Weather widget found, starting gradient updates');
                this.waitForPrayerTimes();
            } else if (attempts < maxAttempts) {
                setTimeout(checkWidget, 1000);
            } else {
                console.warn('Weather widget not found');
            }
        };

        checkWidget();
    }

    waitForPrayerTimes() {
        const maxAttempts = 20;
        let attempts = 0;

        const checkPrayerTimes = () => {
            attempts++;
            this.prayerTimes = this.getPrayerTimes();
            
            if (this.prayerTimes && Object.keys(this.prayerTimes).length > 0) {
                console.log('Prayer times found:', this.prayerTimes);
                this.startGradientUpdates();
            } else if (attempts < maxAttempts) {
                setTimeout(checkPrayerTimes, 1000);
            } else {
                console.warn('Prayer times not found, using time-based gradients');
                this.startTimeBasedGradients();
            }
        };

        checkPrayerTimes();
    }

    getPrayerTimes() {
        if (window.prayerTimes && typeof window.prayerTimes === 'object') {
            return window.prayerTimes;
        }
        
        if (window.currentPrayerTimes) {
            return window.currentPrayerTimes;
        }

        try {
            const storedTimes = localStorage.getItem('prayerTimes');
            if (storedTimes) {
                return JSON.parse(storedTimes);
            }
        } catch (e) {
            console.warn('Error reading prayer times from storage:', e);
        }

        return null;
    }

    startGradientUpdates() {
        this.updateGradient();
        setInterval(() => this.updateGradient(), 60000);
    }

    startTimeBasedGradients() {
        this.updateGradientBasedOnTime();
        setInterval(() => this.updateGradientBasedOnTime(), 60000);
    }

    updateGradient() {
        if (!this.weatherWidget) return;
        
        const currentTime = new Date();
        const currentPrayer = this.getCurrentPrayerPeriod(currentTime);
        
        if (currentPrayer && currentPrayer !== this.currentGradient) {
            this.applyGradient(currentPrayer);
            this.currentGradient = currentPrayer;
        }
    }

    getCurrentPrayerPeriod(currentTime) {
        if (!this.prayerTimes) return this.getTimeBasedPeriod(currentTime);

        const timeString = currentTime.toTimeString().split(' ')[0];
        const currentTimestamp = this.timeToMinutes(timeString);

        const prayers = {
            fajr: this.timeToMinutes(this.prayerTimes.Fajr),
            sunrise: this.timeToMinutes(this.prayerTimes.Sunrise),
            dhuhr: this.timeToMinutes(this.prayerTimes.Dhuhr),
            asr: this.timeToMinutes(this.prayerTimes.Asr),
            maghrib: this.timeToMinutes(this.prayerTimes.Maghrib),
            isha: this.timeToMinutes(this.prayerTimes.Isha)
        };

        if (currentTimestamp < prayers.fajr || currentTimestamp >= prayers.isha) {
            return 'isha';
        } else if (currentTimestamp < prayers.sunrise) {
            return 'fajr';
        } else if (currentTimestamp < prayers.dhuhr) {
            return 'sunrise';
        } else if (currentTimestamp < prayers.asr) {
            return 'dhuhr';
        } else if (currentTimestamp < prayers.maghrib) {
            return 'asr';
        } else {
            return 'maghrib';
        }
    }

    getTimeBasedPeriod(currentTime) {
        const hour = currentTime.getHours();
        console.log('Current hour:', hour);
        
        // Fixed for Saudi Arabia time
        if (hour >= 18 || hour < 4) return 'isha';      // 6 PM - 4 AM (Night)
        else if (hour < 6) return 'fajr';               // 4 AM - 6 AM (Pre-dawn)
        else if (hour < 8) return 'sunrise';            // 6 AM - 8 AM (Sunrise)
        else if (hour < 16) return 'dhuhr';             // 8 AM - 4 PM (Day)
        else if (hour < 18) return 'asr';               // 4 PM - 6 PM (Afternoon)
        else return 'maghrib';                          // 6 PM - 6 PM (Sunset)
    }

    timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    applyGradient(prayerName) {
        if (!this.weatherWidget) return;
        
        const gradientClass = `prayer-gradient-${prayerName}`;
        
        this.weatherWidget.className = this.weatherWidget.className
            .split(' ')
            .filter(cls => !cls.startsWith('prayer-gradient-'))
            .join(' ');
        
        this.weatherWidget.classList.add(gradientClass);
        
        console.log('Applied gradient to weather widget:', gradientClass);
    }

    updateGradientBasedOnTime() {
        if (!this.weatherWidget) return;
        
        const currentTime = new Date();
        const period = this.getTimeBasedPeriod(currentTime);
        
        console.log('Current time:', currentTime.toLocaleTimeString(), 'Detected period:', period);
        
        if (period !== this.currentGradient) {
            this.applyGradient(period);
            this.currentGradient = period;
        }
    }
}

// Initialize when ready
const gradientManager = new PrayerGradientManager();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => gradientManager.init());
} else {
    gradientManager.init();
}
