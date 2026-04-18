const App = (() => {

  const CONFIG = {
    geocodingURL : 'https://geocoding-api.open-meteo.com/v1/search',
    weatherURL   : 'https://api.open-meteo.com/v1/forecast',
    timezoneURL  : 'https://worldtimeapi.org/api/timezone',
    debounceDelay: 500,
    timeoutMs    : 10000,
    maxRecent    : 5,
  };

 /**
   * Weather code lookup table — Task 2
   * Maps WMO Weather Interpretation Codes (description, emoji )
   * Source: https://open-meteo.com/en/docs#weathervariables
   */
  const WEATHER_CODES = {
    0  : { description: 'Clear Sky',                  emoji: '☀️'  },
    1  : { description: 'Mainly Clear',               emoji: '🌤️' },
    2  : { description: 'Partly Cloudy',              emoji: '⛅'  },
    3  : { description: 'Overcast',                   emoji: '☁️'  },
    45 : { description: 'Foggy',                      emoji: '🌫️' },
    48 : { description: 'Icy Fog',                    emoji: '🌫️' },
    51 : { description: 'Light Drizzle',              emoji: '🌦️' },
    53 : { description: 'Moderate Drizzle',           emoji: '🌦️' },
    55 : { description: 'Dense Drizzle',              emoji: '🌧️' },
    61 : { description: 'Slight Rain',                emoji: '🌧️' },
    63 : { description: 'Moderate Rain',              emoji: '🌧️' },
    65 : { description: 'Heavy Rain',                 emoji: '🌧️' },
    71 : { description: 'Slight Snow',                emoji: '🌨️' },
    73 : { description: 'Moderate Snow',              emoji: '🌨️' },
    75 : { description: 'Heavy Snow',                 emoji: '❄️'  },
    77 : { description: 'Snow Grains',                emoji: '🌨️' },
    80 : { description: 'Slight Showers',             emoji: '🌦️' },
    81 : { description: 'Moderate Showers',           emoji: '🌧️' },
    82 : { description: 'Violent Showers',            emoji: '⛈️' },
    85 : { description: 'Slight Snow Showers',        emoji: '🌨️' },
    86 : { description: 'Heavy Snow Showers',         emoji: '❄️'  },
    95 : { description: 'Thunderstorm',               emoji: '⛈️' },
    96 : { description: 'Thunderstorm w/ Hail',       emoji: '⛈️' },
    99 : { description: 'Thunderstorm w/ Heavy Hail', emoji: '⛈️' },
  };

/* STATE
   Everything the app "remembers" lives here, inside this object.
   Like a notebook — we write down what we know.*/
  const state = {
    unit         : 'C',
    lastCity     : null,
    lastWeather  : null,
    debounceTimer: null,
  };

  /* DOM References(Grab all HTML elements we need once at startup — like getting
     all your ingredients from the fridge BEFORE cooking.)*/
  const DOM = {
    cityInput    : document.getElementById('city-input'),
    searchBtn    : document.getElementById('search-btn'),
    validationMsg: document.getElementById('validation-msg'),
    errorBanner  : document.getElementById('error-banner'),
    errorText    : document.getElementById('error-text'),
    retryBtn     : document.getElementById('retry-btn'),
    recentDiv    : document.getElementById('recent-searches'),
    forecastRow  : document.getElementById('forecast-row'),
    cityName     : document.getElementById('city-name'),
    localTime    : document.getElementById('local-time'),
    weatherDesc  : document.getElementById('weather-desc'),
    weatherIcon  : document.getElementById('weather-icon'),
    temperature  : document.getElementById('temperature'),
    humidity     : document.getElementById('humidity'),
    windSpeed    : document.getElementById('wind-speed'),
    btnC         : document.getElementById('btn-celsius'),
    btnF         : document.getElementById('btn-fahrenheit'),
  };

  //  Utils
  const Utils = {
    debounce(fn, delay) {
      return function (...args) {
        clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(() => fn.apply(this, args), delay);
      };
    },
    cToF(c) {
      return ((c * 9) / 5 + 32).toFixed(1);
    },
    formatTemp(value) {
      const val = state.unit === 'F' ? Utils.cToF(value) : Number(value).toFixed(1);
      return `${val}°${state.unit}`;
    },
    decodeWeather(code) {
      return WEATHER_CODES[code] ?? { description: 'Unknown', emoji: '🌡️' };
    },
    getDayName(isoString) {
      const date = new Date(isoString + 'T00:00:00');
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    },
  };

  //  Skeleton
  const Skeleton = {
    showCurrent() {
      const fields = [
        DOM.cityName, DOM.localTime, DOM.weatherDesc,
        DOM.weatherIcon, DOM.temperature, DOM.humidity, DOM.windSpeed,
      ];
      fields.forEach(el => {
        el.classList.add('skeleton');
        el.textContent = ' ';
      });
      DOM.cityName.classList.add('skeleton-text-lg');
      DOM.localTime.classList.add('skeleton-text-sm');
      DOM.weatherDesc.classList.add('skeleton-text-sm');
      DOM.weatherIcon.classList.add('skeleton-circle');
      DOM.temperature.classList.add('skeleton-text-lg');
      DOM.humidity.classList.add('skeleton-text-sm');
      DOM.windSpeed.classList.add('skeleton-text-sm');
    },
    hideCurrent() {
      const fields = [
        DOM.cityName, DOM.localTime, DOM.weatherDesc,
        DOM.weatherIcon, DOM.temperature, DOM.humidity, DOM.windSpeed,
      ];
      fields.forEach(el => {
        el.classList.remove(
          'skeleton', 'skeleton-text', 'skeleton-text-sm',
          'skeleton-text-lg', 'skeleton-circle'
        );
      });
    },
    showForecast() {
      DOM.forecastRow.innerHTML = '';
      for (let i = 0; i < 7; i++) {
        DOM.forecastRow.insertAdjacentHTML('beforeend', `
          <div class="forecast-card">
            <div class="forecast-day  skeleton skeleton-text"    style="width:80%">&nbsp;</div>
            <div class="forecast-icon skeleton skeleton-circle"  style="width:2rem;height:2rem">&nbsp;</div>
            <div class="forecast-high skeleton skeleton-text-sm" style="width:60%">&nbsp;</div>
            <div class="forecast-low  skeleton skeleton-text-sm" style="width:50%">&nbsp;</div>
          </div>
        `);
      }
    },
    hideForecast() {
      DOM.forecastRow.querySelectorAll('.skeleton').forEach(el => {
        el.classList.remove(
          'skeleton', 'skeleton-text', 'skeleton-text-sm',
          'skeleton-text-lg', 'skeleton-circle'
        );
      });
    },
  };

  // ErrorUI 
  const ErrorUI = {
    showBanner(message) {
      DOM.errorText.textContent = message;
      DOM.errorBanner.classList.remove('hidden');
    },
    hideBanner() {
      DOM.errorBanner.classList.add('hidden');
    },
    showValidation(message) {
      DOM.validationMsg.textContent = message;
    },
    clearValidation() {
      DOM.validationMsg.textContent = '';
    },
  };

 //API 
  const API = {

    /**
     * Fetch with AbortController timeout — Task 4, point 19
     * Creates a controller, sets a 10-second timeout, then fetches.
     * If time runs out → controller.abort() is called → fetch rejects.
     *
     * @param {string} url - the URL to fetch
     * @returns {Promise<Response>}
     */
    async fetchWithTimeout(url) {
      // AbortController — like a "cancel" button for the request
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), CONFIG.timeoutMs);
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId); // cancel the timeout if we got a response in time

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        return response;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    },

    /**
     * Step 1 — Geocoding API call
     * Converts a city name string → { latitude, longitude, timezone, name }
     * Task 2, points 5 & 6
     *
     * @param {string} cityName
     * @returns {Promise<Object|null>} city object or null if not found
     */
    async geocodeCity(cityName) {
      const url = `${CONFIG.geocodingURL}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
      const response = await API.fetchWithTimeout(url);
      const data     = await response.json();

      // Task 2, If results array is empty, do NOT throw, return null
      if (!data.results || data.results.length === 0) return null;

      // Return the first (best) result
      const result = data.results[0];
      return {
        name     : result.name,
        country  : result.country_code,
        latitude : result.latitude,
        longitude: result.longitude,
        timezone : result.timezone,
      };
    },

    /**
     * Step 2 — Weather API call
     * Fetches current + hourly + daily forecast using lat/lon.
     * Task 2, point 7
     *
     * @param {number} lat
     * @param {number} lon
     * @returns {Promise<Object>} raw Open-Meteo response
     */
    async fetchWeather(lat, lon) {
      const params = new URLSearchParams({
        latitude        : lat,
        longitude       : lon,
        current_weather : 'true',
        hourly          : 'temperature_2m,relativehumidity_2m,windspeed_10m',
        daily           : 'temperature_2m_max,temperature_2m_min,weathercode',
        timezone        : 'auto',
        forecast_days   : 7,
      });
      const url      = `${CONFIG.weatherURL}?${params.toString()}`;
      const response = await API.fetchWithTimeout(url);
      return response.json();
    },
  };

  //  UI POPULATION-TAKES raw API data & write into DOM
  const UI = {

     /**
     * Populate the current weather card.
     * Task 2 — remove skeletons, fill in data.
     *
     * @param {Object} cityInfo    - from geocodeCity()
     * @param {Object} weatherData - raw Open-Meteo response
     */
    populateCurrent(cityInfo, weatherData) {
      const cw     = weatherData.current_weather; //shorthand
      const hourly = weatherData.hourly;

      // Find the index of the current hour in the hourly array
      // The current_weather.time is like "2024-06-10T14:00"
      const currentHour = cw.time.slice(0, 13);
      const hourIndex   = hourly.time.findIndex(t => t.startsWith(currentHour));
      const safeIndex   = hourIndex >= 0 ? hourIndex : 0;
      const humidity    = hourly.relativehumidity_2m[safeIndex];
      const windSpeed   = hourly.windspeed_10m[safeIndex] ?? cw.windspeed;

      // Decode the weather code → description + emoji
      const weather     = Utils.decodeWeather(cw.weathercode);

     // Save to state for unit conversion without re-fetch
      state.lastWeather = {
        cityInfo,
        temp     : cw.temperature,
        humidity,
        windSpeed,
        weather,
        dailyMax : weatherData.daily.temperature_2m_max,
        dailyMin : weatherData.daily.temperature_2m_min,
        dailyCode: weatherData.daily.weathercode,
        dailyTime: weatherData.daily.time,
      };

      //Remove skeleton classes-data is ready
      Skeleton.hideCurrent();

       // Write data into the DOM
      DOM.cityName.textContent    = `${cityInfo.name}, ${cityInfo.country}`;
      DOM.weatherDesc.textContent = weather.description;
      DOM.weatherIcon.textContent = weather.emoji;
      DOM.temperature.textContent = Utils.formatTemp(cw.temperature);
      DOM.humidity.textContent    = `${humidity ?? '--'}%`;
      DOM.windSpeed.textContent   = `${windSpeed ?? '--'} km/h`;

      // Local time will be filled by jQuery AJAX (Task 3)
      DOM.localTime.textContent   = 'Fetching local time…';
    },

    /**
     * Populate the 7-day forecast row.
     *
     * @param {Object} weatherData - raw Open-Meteo response
     */
    populateForecast(weatherData) {
      const daily = weatherData.daily;

      //Clear exsiting skeleton cards
      DOM.forecastRow.innerHTML = '';

      // Loop thru 7 days and create a card for each
      for (let i = 0; i < 7; i++) {
        const weather = Utils.decodeWeather(daily.weathercode[i]);
        const dayName = Utils.getDayName(daily.time[i]);
        const high    = Utils.formatTemp(daily.temperature_2m_max[i]);
        const low     = Utils.formatTemp(daily.temperature_2m_min[i]);

        // Build the card HTML
        DOM.forecastRow.insertAdjacentHTML('beforeend', `
          <div class="forecast-card" aria-label="${dayName} forecast">
            <div class="forecast-day">${i === 0 ? 'Today' : dayName}</div>
            <div class="forecast-icon" aria-hidden="true">${weather.emoji}</div>
            <div class="forecast-high">${high}</div>
            <div class="forecast-low">${low}</div>
          </div>
        `);
      }
    },

   /**
    * Re-render temperatures only (used by unit toggle — Bonus).
    * No API call needed — already have the data in state.
    */
    rerenderTemperatures() {
      if (!state.lastWeather) return;
      const { temp, dailyMax, dailyMin, dailyCode, dailyTime } = state.lastWeather;
      DOM.temperature.textContent = Utils.formatTemp(temp);
      DOM.forecastRow.innerHTML = '';
      for (let i = 0; i < 7; i++) {
        const weather = Utils.decodeWeather(dailyCode[i]);
        const dayName = Utils.getDayName(dailyTime[i]);
        const high    = Utils.formatTemp(dailyMax[i]);
        const low     = Utils.formatTemp(dailyMin[i]);
        DOM.forecastRow.insertAdjacentHTML('beforeend', `
          <div class="forecast-card">
            <div class="forecast-day">${i === 0 ? 'Today' : dayName}</div>
            <div class="forecast-icon" aria-hidden="true">${weather.emoji}</div>
            <div class="forecast-high">${high}</div>
            <div class="forecast-low">${low}</div>
          </div>
        `);
      }
    },
  };

/*JQUERY AJAX (Task 3)-Fetches the local time for the searched city using WorldTimeAPI.
  Rubric: jQuery AJAX — correct .done()/.fail()/.always() chaining*/
  // TimeService
  const TimeService = {

    /**
     * Fetch local time from WorldTimeAPI using the city's IANA timezone.
     * Task 3
     *
     * @param {string} timezone - e.g. "Asia/Kuala_Lumpur"
     */
    fetchLocalTime(timezone) {
      $.getJSON(`${CONFIG.timezoneURL}/${encodeURIComponent(timezone)}`)
        .done(function (data) {
          const localTime = new Date(data.datetime);
          const timeStr   = localTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          DOM.localTime.textContent = `🕐 Local Time: ${timeStr}`;
        })
        .fail(function () {
          // Task 3 — fallback to browser local time if timezone not available
          const fallback = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          DOM.localTime.textContent = `🕐 Browser Time: ${fallback} (fallback)`;
        })
        .always(function () {
          // Task 3— log timestamp of completed request to browser console
          console.log(`[WeatherNow] WorldTimeAPI request completed at: ${new Date().toISOString()}`);
        });
    },
  };

  // RecentSearches (BONUS:LOCALSTORAGE)
  const RecentSearches = {

    /** Read the saved list from localStorage */
    getList() {
      try { return JSON.parse(localStorage.getItem('weathernow_recent') || '[]'); }
      catch { return []; }
    },

     /** Save a city name (add to front, cap at maxRecent, no duplicates) */
    save(cityName) {
      let list = RecentSearches.getList();
      list = list.filter(c => c.toLowerCase() !== cityName.toLowerCase());
      list.unshift(cityName);
      list = list.slice(0, CONFIG.maxRecent);
      localStorage.setItem('weathernow_recent', JSON.stringify(list));
    },

    /** Render chips below the search bar */
    render() {
      const list = RecentSearches.getList();
      DOM.recentDiv.innerHTML = '';
      if (list.length === 0) return;
      DOM.recentDiv.insertAdjacentHTML('beforeend', '<span style="font-size:0.78rem;color:#475569;align-self:center;">Recent:</span>');
      list.forEach(city => {
        const chip = document.createElement('button');
        chip.className   = 'chip';
        chip.textContent = city;
        chip.setAttribute('aria-label', `Search ${city} again`);
        chip.addEventListener('click', () => { DOM.cityInput.value = city; handleSearch(); });
        DOM.recentDiv.appendChild(chip);
      });
    },
  };

 /*  MAIN SEARCH ORCHESTRATOR
     This is the "conductor" — calls all the other functions
     in the right order, like a cooking show chef!*/

  /**
   * handleSearch — called when user clicks Search or presses Enter.
   * Orchestrates: validate → skeleton → geocode → weather → jQuery time
   */
  async function handleSearch() {
    const cityName = DOM.cityInput.value.trim();
 
    // Task 4 — validate: empty or < 2 characters
    if (cityName.length < 2) {
      ErrorUI.showValidation('⚠️ Please enter at least 2 characters.');
      return;
    }
 
    // Clear any previous messages
    ErrorUI.clearValidation();
    ErrorUI.hideBanner();
 
    // Save and remember for retry
    state.lastCity = cityName;
 
    // Show skeleton loaders while fetching
    Skeleton.showCurrent();
    Skeleton.showForecast();
 
    // Disable search button during request
    DOM.searchBtn.disabled = true;
 
    try {
      /* Step 1: Geocoding (Fetch API) */
      const cityInfo = await API.geocodeCity(cityName);
 
      // Task 2 — city not found , show error state, do not throw
      if (!cityInfo) {
        Skeleton.hideCurrent();
        Skeleton.hideForecast();
        DOM.cityName.textContent  = 'City not found';
        DOM.localTime.textContent = '';
        DOM.weatherDesc.textContent = `We couldn't find "${cityName}". Try a different spelling.`;
        DOM.errorBanner.classList.add('hidden');
        DOM.searchBtn.disabled = false;
        return;
      }
 
      /* Step 2: Weather data (Fetch API, chained after geocoding) */
      const weatherData = await API.fetchWeather(cityInfo.latitude, cityInfo.longitude);
 
      /* Step 3: Populate UI */
      UI.populateCurrent(cityInfo, weatherData);
      UI.populateForecast(weatherData);
 
      /* Step 4: Local time via jQuery AJAX (Task 3)*/
      if (cityInfo.timezone) {
        TimeService.fetchLocalTime(cityInfo.timezone);
      } else {
        // Fallback — no timezone from geocoding
        const fallback = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        DOM.localTime.textContent = `🕐 Browser Time: ${fallback} (no timezone)`;
      }
 
      /* ---- Bonus: Save to recent searches ---- */
      RecentSearches.save(cityInfo.name);
      RecentSearches.render();
 
    } catch (err) {
      // Task 2, point 9 — network / HTTP / timeout errors → show error banner + retry
      Skeleton.hideCurrent();
      Skeleton.hideForecast();
 
      let message = '❌ Network error. Please check your connection.';
 
      if (err.name === 'AbortError') {
        // Task 4 — AbortController timeout error
        message = '⏱️ Request timed out after 10 seconds. Please try again.';
      } else if (err.message.startsWith('HTTP Error')) {
        // Task 4 — HTTP error with status code
        message = `❌ ${err.message}`;
      }
 
      ErrorUI.showBanner(message);
      console.error('[WeatherNow] Fetch error:', err);
 
    } finally {
      // Always re-enable the search button when done
      DOM.searchBtn.disabled = false;
    }
  }
 
  /* EVENT LISTENERS & INIT
     Wire up all user interactions here */
 
  function init() {
 
    /*  Search button click  */
    DOM.searchBtn.addEventListener('click', handleSearch);
 
    /*  Enter key in search input */
    DOM.cityInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSearch();
    });
 
    /* Debounced typing handler (Task 4) 
         The user types quickly → we wait 500ms after they stop
         before making any API call. No redundant calls */
    const debouncedSearch = Utils.debounce(handleSearch, CONFIG.debounceDelay);
    // Attach debounced search to input event
    // still do the immediate search on button/enter — debounce is for live typing
    DOM.cityInput.addEventListener('input', () => {
      // Only auto-search if input is long enough (avoids skeleton flash on short strings)
      if (DOM.cityInput.value.trim().length >= 3) {
        debouncedSearch();
      }
    });
 
    /* Retry button click (Task 2) */
    DOM.retryBtn.addEventListener('click', () => {
      ErrorUI.hideBanner();
      if (state.lastCity) {
        DOM.cityInput.value = state.lastCity;
        handleSearch();
      }
    });
 
    /* Unit toggle buttons (Bonus) */
    DOM.btnC.addEventListener('click', () => {
      if (state.unit === 'C') return;
      state.unit = 'C';
      DOM.btnC.classList.add('active');
      DOM.btnF.classList.remove('active');
      UI.rerenderTemperatures();
    });
 
    DOM.btnF.addEventListener('click', () => {
      if (state.unit === 'F') return;
      state.unit = 'F';
      DOM.btnF.classList.add('active');
      DOM.btnC.classList.remove('active');
      UI.rerenderTemperatures();
    });
 
    /* Render recent searches on page load (Bonus) */
    RecentSearches.render();
 
    /* Build initial skeleton UI so page doesn't look empty */
    Skeleton.showCurrent();
    Skeleton.showForecast();
 
    /* Focus the search input on load for better UX */
    DOM.cityInput.focus();
 
    console.log('[WeatherNow] App initialized ✅');
  }
 
  /* Run init when the DOM is ready */
  init();

  return {};
})();