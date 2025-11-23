// Prayer Time Gradient System for Weather Widget Only
class PrayerGradientManager {
    constructor() {
        this.currentGradient = null;
        this.prayerTimes = null;
        this.weatherWidget = null;
    }

    init() {
        console.log('Initializing prayer gradients for weather widget...');
        this.startImmediately();
    }

    startImmediately() {
        // Try to find weather widget immediately
        this.weatherWidget = document.querySelector('.weather-widget');
        
        if (this.weatherWidget) {
            console.log('Weather widget found, starting gradients immediately');
            // Apply gradient right away based on current time
            this.updateGradientBasedOnTime();
            // Update every minute
            setInterval(() => this.updateGradientBasedOnTime(), 60000);
        } else {
            // If not found, wait just 3 seconds max
            console.log('Weather widget not found, waiting 3 seconds...');
            setTimeout(() => {
                this.weatherWidget = document.querySelector('.weather-widget');
                if (this.weatherWidget) {
                    this.updateGradientBasedOnTime();
                    setInterval(() => this.updateGradientBasedOnTime(), 60000);
                }
            }, 3000);
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

// Initialize immediately - no waiting for DOM ready
const gradientManager = new PrayerGradientManager();
gradientManager.init();
