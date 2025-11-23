// Prayer Time Gradient System for Weather Widget Only
class PrayerGradientManager {
    constructor() {
        this.currentGradient = null;
        this.weatherWidget = null;
    }

    init() {
        console.log('Initializing prayer gradients...');
        this.startImmediately();
    }

    startImmediately() {
        this.weatherWidget = document.querySelector('.weather-widget');
        
        if (this.weatherWidget) {
            console.log('Weather widget found!');
            this.updateGradientBasedOnTime();
            setInterval(() => this.updateGradientBasedOnTime(), 60000);
        } else {
            setTimeout(() => this.startImmediately(), 1000);
        }
    }

    getTimeBasedPeriod(currentTime) {
        const hour = currentTime.getHours();
        console.log('Current hour:', hour);
        
        if (hour >= 18 || hour < 4) return 'isha';
        else if (hour < 6) return 'fajr';
        else if (hour < 8) return 'sunrise';
        else if (hour < 16) return 'dhuhr';
        else if (hour < 18) return 'asr';
        else return 'maghrib';
    }

    applyGradient(prayerName) {
        if (!this.weatherWidget) return;
        
        const gradientClass = `prayer-gradient-${prayerName}`;
        
        this.weatherWidget.className = this.weatherWidget.className
            .split(' ')
            .filter(cls => !cls.startsWith('prayer-gradient-'))
            .join(' ');
        
        this.weatherWidget.classList.add(gradientClass);
        
        console.log('Applied gradient:', gradientClass);
    }

    updateGradientBasedOnTime() {
        if (!this.weatherWidget) return;
        
        const currentTime = new Date();
        const period = this.getTimeBasedPeriod(currentTime);
        
        if (period !== this.currentGradient) {
            this.applyGradient(period);
            this.currentGradient = period;
        }
    }
}

// Start immediately
const gradientManager = new PrayerGradientManager();
gradientManager.init();
