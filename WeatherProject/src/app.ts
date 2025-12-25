import "dotenv/config";
import express, { Request, Response } from "express";
import path from "path";

const app = express();
const port = 3000;

// Serve static files (HTML, CSS, Client JS) from the public folder
app.use(express.static(path.join(__dirname, "../public")));

// --- Type Definitions ---
type WeatherResp = {
  coord: { lon: number; lat: number };
  main: { temp: number };
  weather: { description: string; icon: string }[];
  name: string; // Added 'name' here so we don't need to cast it later
};

type PollutionResp = {
  list: {
    main: { aqi: number };
    components: { pm2_5: number; pm10: number };
  }[];
};

// --- API Route ---
app.get("/api/weather", async (req: Request, res: Response) => {
  // Step 1: Get city from query or default to London
  const city = (req.query.city as string) || "London";
  
  // FIXED: Corrected typo OPENWATHER_KEY -> OPENWEATHER_KEY
  const appKey = process.env.OPENWEATHER_KEY;

  if (!appKey) {
    return res.status(500).json({ message: "Missing OPENWEATHER_KEY in .env file" });
  }

  try {
    // Step 2: Fetch Weather API
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${appKey}&units=metric`;
    const weatherRes = await fetch(weatherUrl);
    
    if (!weatherRes.ok) {
        return res.status(404).json({ message: "City not found" });
    }

    const weatherData = (await weatherRes.json()) as WeatherResp;

    // Step 3: Extract coordinates
    const { lat, lon } = weatherData.coord;

    // Step 4: Fetch Air Pollution API
    const pollutionUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${appKey}`;
    const pollutionRes = await fetch(pollutionUrl);
    const pollutionData = (await pollutionRes.json()) as PollutionResp;

    // Step 5: Format response for the frontend
    // This structure matches exactly what your main.js expects:
    // data.city, data.temp, data.desc, data.iconUrl, data.aqi, etc.
    const result = {
      city: weatherData.name,
      temp: weatherData.main.temp,
      desc: weatherData.weather[0].description,
      iconUrl: `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`,
      aqi: pollutionData.list[0].main.aqi,
      pm25: pollutionData.list[0].components.pm2_5,
      pm10: pollutionData.list[0].components.pm10,
    };

    return res.json(result);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error fetching weather data" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});