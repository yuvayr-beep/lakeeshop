'use client';
import React, { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Loader2 } from 'lucide-react';

interface WeatherData {
  temp: number;
  code: number;
}

const getWeatherIcon = (code: number) => {
  // WMO Weather interpretation codes (https://open-meteo.com/en/docs)
  if ([0].includes(code)) {
    return (
      <Sun 
        className="w-10 h-10 text-amber-300 animate-[spin_40s_linear_infinite]" 
        style={{ filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.5))' }}
      />
    );
  }
  if ([1, 2, 3].includes(code)) {
    return (
      <Cloud 
        className="w-10 h-10 text-sky-100" 
        style={{ filter: 'drop-shadow(0 0 10px rgba(224, 242, 254, 0.4))' }}
      />
    );
  }
  if ([45, 48].includes(code)) {
    return (
      <Cloud 
        className="w-10 h-10 text-gray-300" 
        style={{ filter: 'drop-shadow(0 0 6px rgba(209, 213, 219, 0.3))' }}
      />
    );
  }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return (
      <CloudRain 
        className="w-10 h-10 text-blue-300" 
        style={{ filter: 'drop-shadow(0 0 8px rgba(147, 197, 253, 0.4))' }}
      />
    );
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return (
      <CloudSnow 
        className="w-10 h-10 text-blue-100" 
        style={{ filter: 'drop-shadow(0 0 8px rgba(239, 246, 255, 0.5))' }}
      />
    );
  }
  if ([95, 96, 99].includes(code)) {
    return (
      <CloudLightning 
        className="w-10 h-10 text-yellow-400 animate-pulse" 
        style={{ filter: 'drop-shadow(0 0 10px rgba(250, 204, 21, 0.6))' }}
      />
    );
  }
  return (
    <Sun 
      className="w-10 h-10 text-amber-300" 
      style={{ filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.5))' }}
    />
  );
};

const getWeatherDesc = (code: number): string => {
  if (code === 0) return 'Sunny';
  if ([1, 2, 3].includes(code)) return 'Partly Cloudy';
  if ([45, 48].includes(code)) return 'Foggy';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rainy';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snowy';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Sunny';
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    // 1. Fetch weather
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
            );
            const data = await res.json();
            if (data && data.current) {
              setWeather({
                temp: Math.round(data.current.temperature_2m),
                code: data.current.weather_code,
              });
            }
          } catch (error) {
            console.error('Error fetching weather:', error);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.warn('Geolocation error or permission denied:', error);
          const fetchDefaultWeather = async () => {
            try {
              const res = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=12.9716&longitude=77.5946&current=temperature_2m,weather_code`
              );
              const data = await res.json();
              if (data && data.current) {
                setWeather({
                  temp: Math.round(data.current.temperature_2m),
                  code: data.current.weather_code,
                });
              }
            } catch (e) {
              console.error('Error fetching fallback weather:', e);
            } finally {
              setLoading(false);
            }
          };
          fetchDefaultWeather();
        }
      );
    } else {
      setLoading(false);
    }

    // 2. Date and Time ticker
    const updateDateTime = () => {
      const now = new Date();
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      const monthName = now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const dayNum = now.getDate();
      setDate(`${dayName}, ${monthName} ${dayNum}`);

      const timeStr = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      setTime(timeStr);
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full w-9 h-9">
        <Loader2 className="w-4 h-4 text-white animate-spin" />
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="flex flex-col items-start text-left select-none text-white/90">
      {/* Weather Row */}
      <div className="flex items-center gap-3">
        {getWeatherIcon(weather.code)}
        <span className="text-4xl font-extralight tracking-tight text-white drop-shadow-md">
          {weather.temp}°C
        </span>
      </div>

      {/* Description Row */}
      <span className="text-[10px] font-semibold text-white/70 mt-2 tracking-widest uppercase drop-shadow">
        {weather.temp}°C, {getWeatherDesc(weather.code)}
      </span>

      {/* Date & Time Rows */}
      <div className="mt-3 flex flex-col items-start leading-none border-t border-white/10 pt-3 w-full">
        <span className="text-[8px] font-semibold tracking-[0.2em] text-white/50 uppercase">
          {date}
        </span>
        <span className="text-xs font-light tracking-wide text-white/80 mt-1.5">
          {time}
        </span>
      </div>
    </div>
  );
}
