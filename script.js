// Global location variables (will be set by location detection)
let CURRENT_LAT = 27.0040;
let CURRENT_LNG = 49.6460;
let CURRENT_LOCATION_NAME = "Jubail, Saudi Arabia";

// Arabic prayer names
const prayerArabicNames = {
    Fajr: "الفجر",
    Sunrise: "الشروق", 
    Dhuhr: "الظهر",
    Asr: "العصر", 
    Maghrib: "المغرب", 
    Isha: "العشاء"
};

// DOM Elements
const currentDateEl = document.getElementById('currentDate');
const hijriDateEl = document.getElementById('hijriDate');
const currentTimeEl = document.getElementById('currentTime');
const countdownTitleEl = document.getElementById('countdownTitle');
const countdownTimerEl = document.getElementById('countdownTimer');
const prayerGridEl = document.getElementById('prayerGrid');
const errorMessageEl = document.getElementById('errorMessage');
const locationEl = document.getElementById('locationText');


// Prayer times data
let prayerTimes = {};
let activePrayer = '';
let nextPrayer = '';
let apiAttempts = 0;
const MAX_API_ATTEMPTS = 2;

// Initialize app with location detection
async function initApp() {
    // Update UI to show location detection
    locationEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting location...';
    
    try {
        // Get user location first
        await initLocation();
        
        // Then proceed with normal app initialization
        continueAppInitialization();
        
    } catch (error) {
        console.error('App initialization failed:', error);
        // Continue with fallback location
        locationEl.textContent = 'Jubail, Saudi Arabia';
        continueAppInitialization();
    }
}

// Initialize location
async function initLocation() {
    try {
        const location = await locationService.getUserLocation();
        
        CURRENT_LAT = location.latitude;
        CURRENT_LNG = location.longitude;
        CURRENT_LOCATION_NAME = location.displayName;
        
        // Update UI
        locationEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${location.displayName}`;
        
        // Show fallback indicator if used
        if (location.isFallback) {
            showTemporaryMessage('Using default location. Enable location access for accurate times.', 'warning');
        }
        
        console.log('Location detected:', location);
        
    } catch (error) {
        console.error('Location initialization failed:', error);
        locationEl.innerHTML = '<i class="fas fa-map-marker-alt"></i> Jubail, Saudi Arabia';
        showTemporaryMessage('Using default location', 'info');
    }
}

// Show temporary message
function showTemporaryMessage(message, type = 'info') {
    const tempMsg = document.createElement('div');
    tempMsg.className = `temp-message ${type}`;
    tempMsg.textContent = message;
    tempMsg.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'warning' ? '#ff9800' : '#4CAF50'};
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000;
        font-size: 0.9rem;
        animation: fadeInOut 5s ease-in-out;
    `;
    
    // Add fade animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0%, 100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            10%, 90% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(tempMsg);
    
    setTimeout(() => {
        tempMsg.remove();
        style.remove();
    }, 5000);
}

// Continue app initialization after location
function continueAppInitialization() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // Show fallback data immediately while API loads
    const fallbackData = getFallbackPrayerTimes();
    prayerTimes = fallbackData.timings;
    hijriDateEl.textContent = `${fallbackData.date.hijri.day} ${fallbackData.date.hijri.month.en} ${fallbackData.date.hijri.year} AH`;
    displayPrayerTimes();
    updateCountdown();
    
    // Then try to load from API with actual location
    setTimeout(() => {
        initPrayerTimes();
    }, 1000);
    
    setInterval(updateCountdown, 1000);
    
    // Update prayer times at midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const timeToMidnight = midnight - now;
    
    setTimeout(() => {
        initPrayerTimes();
        // Set daily update
        setInterval(initPrayerTimes, 24 * 60 * 60 * 1000);
    }, timeToMidnight);
}

// Update current time
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
    });
    currentTimeEl.textContent = timeString;
    
    // Update date once a day
    if (!currentDateEl.textContent.includes(now.toLocaleDateString())) {
        updateDateInfo(now);
    }
}

// Update date information
function updateDateInfo(date) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    currentDateEl.textContent = date.toLocaleDateString('en-US', options);
}

// Show error message
function showError(message) {
    errorMessageEl.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <div>${message}</div>
            <button class="retry-button" onclick="retryLoadPrayerTimes()">
                <i class="fas fa-redo"></i> Retry
            </button>
        </div>
    `;
    errorMessageEl.style.display = 'block';
}

// Hide error message
function hideError() {
    errorMessageEl.style.display = 'none';
}

// Retry loading prayer times
function retryLoadPrayerTimes() {
    hideError();
    apiAttempts = 0;
    initPrayerTimes();
}

// Fetch prayer times from API with dynamic location
async function fetchPrayerTimes() {
    const today = new Date();
    const dateString = `${today.getDate()}-${today.getMonth()+1}-${today.getFullYear()}`;
    
    // Try different API endpoints with current location
    const apiEndpoints = [
        `https://api.aladhan.com/v1/timings/${dateString}?latitude=${CURRENT_LAT}&longitude=${CURRENT_LNG}&method=4`,
        `https://corsproxy.io/?${encodeURIComponent(`https://api.aladhan.com/v1/timings/${dateString}?latitude=${CURRENT_LAT}&longitude=${CURRENT_LNG}&method=4`)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://api.aladhan.com/v1/timings/${dateString}?latitude=${CURRENT_LAT}&longitude=${CURRENT_LNG}&method=4`)}`
    ];
    
    for (let i = apiAttempts; i < apiEndpoints.length; i++) {
        try {
            console.log(`Trying API endpoint ${i + 1} for ${CURRENT_LOCATION_NAME}...`);
            const response = await fetch(apiEndpoints[i], {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Successfully fetched prayer times for:', CURRENT_LOCATION_NAME);
            return data.data;
        } catch (error) {
            console.warn(`API attempt ${i + 1} failed:`, error);
            if (i === apiEndpoints.length - 1) {
                throw error;
            }
        }
    }
    
    throw new Error('All API attempts failed');
}

// Get accurate prayer times based on current date
function getFallbackPrayerTimes() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    
    // Sample prayer times (adjusted for general use)
    let times;
    
    if (month >= 3 && month <= 5) { // Spring
        times = {
            Fajr: "04:15",
            Sunrise: "05:35",
            Dhuhr: "11:55",
            Asr: "15:25",
            Maghrib: "18:15",
            Isha: "19:45"
        };
    } else if (month >= 6 && month <= 8) { // Summer
        times = {
            Fajr: "03:45",
            Sunrise: "05:05",
            Dhuhr: "11:45",
            Asr: "15:15",
            Maghrib: "18:35",
            Isha: "20:05"
        };
    } else if (month >= 9 && month <= 11) { // Autumn
        times = {
            Fajr: "04:30",
            Sunrise: "05:50",
            Dhuhr: "11:50",
            Asr: "15:10",
            Maghrib: "17:55",
            Isha: "19:25"
        };
    } else { // Winter
        times = {
            Fajr: "04:55",
            Sunrise: "06:15",
            Dhuhr: "11:45",
            Asr: "14:55",
            Maghrib: "17:25",
            Isha: "18:55"
        };
    }
    
    // Calculate Hijri date
    const hijriDay = (day + 10) % 30 || 30;
    const hijriMonths = ["Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani", "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qadah", "Dhu al-Hijjah"];
    const hijriMonth = hijriMonths[(month + 5) % 12];
    const hijriYear = 1445; // Approximate Hijri year
    
    return {
        timings: times,
        date: {
            hijri: {
                day: hijriDay,
                month: { en: hijriMonth },
                year: hijriYear.toString()
            }
        }
    };
}

// Initialize prayer times
async function initPrayerTimes() {
    try {
        apiAttempts++;
        hideError();
        
        let prayerData;
        if (apiAttempts <= MAX_API_ATTEMPTS) {
            prayerData = await fetchPrayerTimes();
        } else {
            throw new Error('Using fallback data after multiple attempts');
        }
        
        // Update Hijri date
        const hijri = prayerData.date.hijri;
        hijriDateEl.textContent = `${hijri.day} ${hijri.month.en} ${hijri.year} AH`;
        
        // Extract prayer times
        prayerTimes = {
            Fajr: prayerData.timings.Fajr,
            Sunrise: prayerData.timings.Sunrise,
            Dhuhr: prayerData.timings.Dhuhr,
            Asr: prayerData.timings.Asr,
            Maghrib: prayerData.timings.Maghrib,
            Isha: prayerData.timings.Isha
        };
        
        // Display prayer times
        displayPrayerTimes();
        
        // Start countdown
        updateCountdown();
        
    } catch (error) {
        console.error('Error loading prayer times:', error);
        
        // Use fallback data
        const fallbackData = getFallbackPrayerTimes();
        prayerTimes = {
            Fajr: fallbackData.timings.Fajr,
            Sunrise: fallbackData.timings.Sunrise,
            Dhuhr: fallbackData.timings.Dhuhr,
            Asr: fallbackData.timings.Asr,
            Maghrib: fallbackData.timings.Maghrib,
            Isha: fallbackData.timings.Isha
        };
        
        hijriDateEl.textContent = `${fallbackData.date.hijri.day} ${fallbackData.date.hijri.month.en} ${fallbackData.date.hijri.year} AH`;
        
        displayPrayerTimes();
        updateCountdown();
        
        showError(`Using approximate prayer times. ${error.message}`);
    }
}

// Format time to 12-hour format
function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
}

// Display prayer times in the grid
function displayPrayerTimes() {
    const prayerIcons = {
        Fajr: "fas fa-star-and-crescent",
        Sunrise: "fas fa-sun",
        Dhuhr: "fas fa-sun",
        Asr: "fas fa-cloud-sun", 
        Maghrib: "fas fa-sun",
        Isha: "fas fa-moon"
    };
    
    prayerGridEl.innerHTML = '';
    
    Object.entries(prayerTimes).forEach(([prayerName, time]) => {
        const prayerCard = document.createElement('div');
        prayerCard.className = 'prayer-card';
        prayerCard.id = `prayer-${prayerName}`;
        
        if (prayerName === "Fajr" || prayerName === "Sunrise" || prayerName === "Dhuhr" || prayerName === "Asr" || prayerName === "Maghrib" || prayerName === "Isha")  {
            prayerCard.innerHTML = `
                <div class="prayer-name">
                    <i class="${prayerIcons[prayerName]}"></i>
                    <span>${prayerArabicNames[prayerName]} (${prayerName})</span>
                </div>
                <div class="prayer-time">${formatTime(time)}</div>
            `;
        } else {
            prayerCard.innerHTML = `
                <div class="prayer-name">
                    <i class="${prayerIcons[prayerName]}"></i>
                    <span>${prayerName}</span>
                </div>
                <div class="prayer-time">${formatTime(time)}</div>
            `;
        }
        
        prayerGridEl.appendChild(prayerCard);
    });
}

// Update countdown to next prayer
function updateCountdown() {
    const now = new Date();
    const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    
    // Reset active prayer classes
    document.querySelectorAll('.prayer-card').forEach(card => {
        card.classList.remove('active', 'next');
    });
    
    // Find current and next prayer
    let nextPrayerName = '';
    let nextPrayerTime = null;
    let activePrayerName = '';
    
    Object.entries(prayerTimes).forEach(([prayer, time]) => {
        const [hours, minutes] = time.split(':');
        const prayerTime = parseInt(hours) * 3600 + parseInt(minutes) * 60;
        
        if (prayerTime <= currentTime) {
            activePrayerName = prayer;
        } else if (!nextPrayerTime || prayerTime < nextPrayerTime) {
            nextPrayerName = prayer;
            nextPrayerTime = prayerTime;
        }
    });
    
    // If no next prayer found, use first prayer of next day
    if (!nextPrayerName) {
        nextPrayerName = 'Fajr';
        nextPrayerTime = 24 * 3600 + (parseInt(prayerTimes.Fajr.split(':')[0]) * 3600 + 
                      parseInt(prayerTimes.Fajr.split(':')[1]) * 60);
    }
    
    // Update UI
    if (activePrayerName) {
        const activeCard = document.getElementById(`prayer-${activePrayerName}`);
        if (activeCard) activeCard.classList.add('active');
    }
    
    const nextCard = document.getElementById(`prayer-${nextPrayerName}`);
    if (nextCard) nextCard.classList.add('next');
    
    // Calculate time difference
    let timeDiff = nextPrayerTime - currentTime;
    if (timeDiff < 0) timeDiff += 24 * 3600; // Add 24 hours if negative
    
    // Update countdown
    const hours = Math.floor(timeDiff / 3600);
    const minutes = Math.floor((timeDiff % 3600) / 60);
    const seconds = timeDiff % 60;
    
    countdownTitleEl.textContent = `Time until ${nextPrayerName}:`;
    countdownTimerEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update active and next prayer variables
    activePrayer = activePrayerName;
    nextPrayer = nextPrayerName;
}

// Manual location refresh function
function refreshLocation() {
    locationEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating location...';
    
    locationService.refreshLocation()
        .then(location => {
            CURRENT_LAT = location.latitude;
            CURRENT_LNG = location.longitude;
            CURRENT_LOCATION_NAME = location.displayName;
            
            locationEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${location.displayName}`;
            showTemporaryMessage('Location updated successfully!', 'success');
            
            // Refresh prayer times with new location
            initPrayerTimes();
        })
        .catch(error => {
            locationEl.innerHTML = '<i class="fas fa-map-marker-alt"></i> Jubail, Saudi Arabia';
            showTemporaryMessage('Location update failed', 'warning');
        });
}

// Start the app
// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
