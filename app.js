const App = (() => {

  const CONFIG = {
    geocodingURL : 'https://geocoding-api.open-meteo.com/v1/search',
    weatherURL   : 'https://api.open-meteo.com/v1/forecast',
    timezoneURL  : 'https://worldtimeapi.org/api/timezone',
    debounceDelay: 500,
    timeoutMs    : 10000,
    maxRecent    : 5,
  };

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

  const state = {
    unit         : 'C',
    lastCity     : null,
    lastWeather  : null,
    debounceTimer: null,
  };

  //  DOM References
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
    async fetchWithTimeout(url) {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), CONFIG.timeoutMs);
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }
        return response;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    },
    async geocodeCity(cityName) {
      const url = `${CONFIG.geocodingURL}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
      const response = await API.fetchWithTimeout(url);
      const data     = await response.json();
      if (!data.results || data.results.length === 0) return null;
      const result = data.results[0];
      return {
        name     : result.name,
        country  : result.country_code,
        latitude : result.latitude,
        longitude: result.longitude,
        timezone : result.timezone,
      };
    },
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

  //  UI 
  const UI = {
    populateCurrent(cityInfo, weatherData) {
      const cw     = weatherData.current_weather;
      const hourly = weatherData.hourly;
      const currentHour = cw.time.slice(0, 13);
      const hourIndex   = hourly.time.findIndex(t => t.startsWith(currentHour));
      const safeIndex   = hourIndex >= 0 ? hourIndex : 0;
      const humidity    = hourly.relativehumidity_2m[safeIndex];
      const windSpeed   = hourly.windspeed_10m[safeIndex] ?? cw.windspeed;
      const weather     = Utils.decodeWeather(cw.weathercode);
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
      Skeleton.hideCurrent();
      DOM.cityName.textContent    = `${cityInfo.name}, ${cityInfo.country}`;
      DOM.weatherDesc.textContent = weather.description;
      DOM.weatherIcon.textContent = weather.emoji;
      DOM.temperature.textContent = Utils.formatTemp(cw.temperature);
      DOM.humidity.textContent    = `${humidity ?? '--'}%`;
      DOM.windSpeed.textContent   = `${windSpeed ?? '--'} km/h`;
      DOM.localTime.textContent   = 'Fetching local time…';
    },
    populateForecast(weatherData) {
      const daily = weatherData.daily;
      DOM.forecastRow.innerHTML = '';
      for (let i = 0; i < 7; i++) {
        const weather = Utils.decodeWeather(daily.weathercode[i]);
        const dayName = Utils.getDayName(daily.time[i]);
        const high    = Utils.formatTemp(daily.temperature_2m_max[i]);
        const low     = Utils.formatTemp(daily.temperature_2m_min[i]);
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

  // TimeService
  const TimeService = {
    fetchLocalTime(timezone) {
      $.getJSON(`${CONFIG.timezoneURL}/${encodeURIComponent(timezone)}`)
        .done(function (data) {
          const localTime = new Date(data.datetime);
          const timeStr   = localTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          DOM.localTime.textContent = `🕐 Local Time: ${timeStr}`;
        })
        .fail(function () {
          const fallback = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          DOM.localTime.textContent = `🕐 Browser Time: ${fallback} (fallback)`;
        })
        .always(function () {
          console.log(`[WeatherNow] WorldTimeAPI request completed at: ${new Date().toISOString()}`);
        });
    },
  };
  

  return {};
})();