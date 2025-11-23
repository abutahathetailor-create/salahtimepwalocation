// Prayer Time Gradient System
class PrayerGradientManager {
    constructor() {
        this.currentGradient = null;
        this.prayerTimes = null;
    }

    init() {
        console.log('Initializing prayer gradients...');
        this.waitForPrayerTimes();
    }

    waitForPrayerTimes() {
        // Wait for prayer times to be available from main app
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
        // Try to get prayer times from your main app
        if (window.prayerTimes && typeof window.prayerTimes === 'object') {
            return window.prayerTimes;
        }
        
        // Check if prayer times are in global scope
        if (window.currentPrayerTimes) {
            return window.currentPrayerTimes;
        }

        // Check localStorage
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
        // Update gradient immediately
        this.updateGradient();
        
        // Update every minute to catch prayer time changes
        setInterval(() => this.updateGradient(), 60000);
    }

    startTimeBasedGradients() {
        // Fallback: use time of day if prayer times not available
        this.updateGradientBasedOnTime();
        setInterval(() => this.updateGradientBasedOnTime(), 60000);
    }

    updateGradient() {
        const currentTime = new Date();
        const currentPrayer = this.getCurrentPrayerPeriod(currentTime);
        
        if (currentPrayer && currentPrayer !== this.currentGradient) {
            this.applyGradient(currentPrayer);
            this.currentGradient = currentPrayer;
        }
    }

    getCurrentPrayerPeriod(currentTime) {
        if (!this.prayerTimes) return this.getTimeBasedPeriod(currentTime);

        const timeString = currentTime.toTimeString().split(' ')[0]; // HH:MM:SS
        const currentTimestamp = this.timeToMinutes(timeString);

        // Convert prayer times to minutes for comparison
        const prayers = {
            fajr: this.timeToMinutes(this.prayerTimes.Fajr),
            sunrise: this.timeToMinutes(this.prayerTimes.Sunrise),
            dhuhr: this.timeToMinutes(this.prayerTimes.Dhuhr),
            asr: this.timeToMinutes(this.prayerTimes.Asr),
            maghrib: this.timeToMinutes(this.prayerTimes.Maghrib),
            isha: this.timeToMinutes(this.prayerTimes.Isha)
        };

        // Determine current prayer period
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
        
        if (hour >= 21 || hour < 4) return 'isha';      // 9 PM - 4 AM
        else if (hour < 6) return 'fajr';               // 4 AM - 6 AM
        else if (hour < 12) return 'sunrise';           // 6 AM - 12 PM
        else if (hour < 15) return 'dhuhr';             // 12 PM - 3 PM
        else if (hour < 18) return 'asr';               // 3 PM - 6 PM
        else return 'maghrib';                          // 6 PM - 9 PM
    }

    timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    applyGradient(prayerName) {
        const gradientClass = `prayer-gradient-${prayerName}`;
        
        // Remove existing gradient classes
        document.body.className = document.body.className
            .split(' ')
            .filter(cls => !cls.startsWith('prayer-gradient-'))
            .join(' ');
        
        // Add new gradient class
        document.body.classList.add(gradientClass);
        
        console.log(`Applied gradient: ${gradientClass}`);
    }

    updateGradientBasedOnTime() {
        const currentTime = new Date();
        const period = this.getTimeBasedPeriod(currentTime);
        
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
