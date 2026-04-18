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

  return {};
})();