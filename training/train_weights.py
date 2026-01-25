"""
Weather Disruption Analysis Script
-----------------------------------
This script analyzes historical weather data to figure out which weather
factors between rain, wind, and emperature have the biggest impact on whether a
day is bad for outdoor plans or not.

This script downloads real weather data, labels each day as good or bad based on
standard meteorological thresholds, then uses logistic regression to find
the relative importance of each factor.

The output is a JSON file with weights that can be used in PlanCast.
"""

import json
import requests
import pandas as pd
from datetime import datetime, timedelta
from sklearn.linear_model import LogisticRegression


# ------------------------------------------ CONFIG ------------------------------------------

DAYS_TO_ANALYZE = 60

CITIES = [
    # Florida cities
    {"name": "Miami",        "lat": 25.76, "lon": -80.19},
    {"name": "Tampa",        "lat": 27.95, "lon": -82.46},
    {"name": "Orlando",      "lat": 28.54, "lon": -81.38},
    {"name": "Jacksonville", "lat": 30.33, "lon": -81.66},

    # Other US cities
    {"name": "New York",     "lat": 40.71, "lon": -74.01},
    {"name": "Chicago",      "lat": 41.88, "lon": -87.63},
    {"name": "Denver",       "lat": 39.74, "lon": -104.99},
    {"name": "Seattle",      "lat": 47.61, "lon": -122.33},
]


# ------------------------------------------ WEATHER THRESHOLDS ------------------------------------------
# A day is marked as disrupted if any of these conditions are true...

# Rain threshold: 5mm per day
# Source: World Meteorological Organization classifies precipitation as:
#   Light rain: < 2.5 mm/hour
#   Moderate rain: 2.5 - 7.5 mm/hour
#   Heavy rain: > 7.5 mm/hour
# 5mm total for the day is moderate and would make most outdoor activities unpleasant
# Reference: https://www.weather.gov/bgm/forecast_terms

RAIN_THRESHOLD = 5.0

# Wind threshold: 8 m/s (about 18 mph or 29 km/h)
# Source: Beaufort Wind Scale:
#   5.5-8 m/s = Moderate breeze
#   8-10.7 m/s = Stronger Breeze
# At 8 m/s outdoor dining and other activities become difficult,
# Reference: https://www.weather.gov/mfl/beaufort

WIND_THRESHOLD = 8.0

# Temperature threshold: more than 15 degrees from 20C (68F)
# < 5C (41F) or > 35C (95F) is considered disruptive.
# Source: OSHA and CDC guidelines on temperature safety:
#   Below 40F (4.4C): Risk of hypothermia
#   Above 91F (32.8C): Risk of heat exhaustion
# Reference: https://www.cdc.gov/niosh/topics/heatstress/
IDEAL_TEMP = 20.0  # roughly room temperature
TEMP_DEVIATION_THRESHOLD = 15.0

# Output filename
OUTPUT_FILE = "learned_weights.json"


# ------------------------------------------ DOWNLOAD WEATHER DATA ------------------------------------------

def download_weather_data():
    """
    Downloads historical weather data from cities using
    Open-Meteo API. Returns a combined pandas DataFrame.

    The API gives daily values for...
    Average temperature at 2 meters height
    Total rainfall for the day
    Maximum wind speed at 10 meters height
    """
    print("Step 1: Downloading weather data...")
    print(f"Analyzing {DAYS_TO_ANALYZE} days from {len(CITIES)} cities")

    # Calculate the date range
    end_date = datetime.now() - timedelta(days=1)
    start_date = end_date - timedelta(days=DAYS_TO_ANALYZE)

    start_str = start_date.strftime("%Y-%m-%d")
    end_str = end_date.strftime("%Y-%m-%d")

    print(f"Date range: {start_str} to {end_str}")

    # Collect data from each city
    all_city_data = []

    for city in CITIES:
        print(f"Fetching {city['name']}...")

        # Make API URL
        url = (
            f"https://archive-api.open-meteo.com/v1/archive"
            f"?latitude={city['lat']}"
            f"&longitude={city['lon']}"
            f"&start_date={start_str}"
            f"&end_date={end_str}"
            f"&daily=temperature_2m_mean,precipitation_sum,wind_speed_10m_max"
            f"&timezone=auto"
        )

        # Make the request
        response = requests.get(url)

        if response.status_code != 200:
            print(f"Warning: Failed to get data for {city['name']}")
            continue

        data = response.json()

        # Convert wind from km/h (API Return) to m/s
        wind_in_ms = [speed / 3.6 for speed in data["daily"]["wind_speed_10m_max"]]

        # Create a DataFrame for this city
        city_df = pd.DataFrame({
            "city": city["name"],
            "date": data["daily"]["time"],
            "temp": data["daily"]["temperature_2m_mean"],
            "rain": data["daily"]["precipitation_sum"],
            "wind": wind_in_ms
        })

        all_city_data.append(city_df)

    # Combine all cities into one big DataFrame
    combined_df = pd.concat(all_city_data, ignore_index=True)

    print(f"Total data points: {len(combined_df)} days")

    return combined_df


# ------------------------------------------ LABEL EACH DAY ------------------------------------------

def label_days(df):
    """
    Marks days as "disrupted" (1) or "normal" (0)
    based on if any of the weather thresholds were exceeded.

    A day is disrupted if ANY of these are true:
    Rain was above the threshold
    Wind was above the threshold
    Temperature was too far from the ideal
    """
    print("\nStep 2: Labeling days as good or bad...")
    print(f"Thresholds:")
    print(f"Rain > {RAIN_THRESHOLD}mm")
    print(f"Wind > {WIND_THRESHOLD} m/s")
    print(f"Temp outside {IDEAL_TEMP - TEMP_DEVIATION_THRESHOLD}C to {IDEAL_TEMP + TEMP_DEVIATION_THRESHOLD}C")

    too_rainy = df["rain"] > RAIN_THRESHOLD
    too_windy = df["wind"] > WIND_THRESHOLD
    too_extreme_temp = abs(df["temp"] - IDEAL_TEMP) > TEMP_DEVIATION_THRESHOLD

    # A day is disrupted if any condition is true
    df["disrupted"] = (too_rainy | too_windy | too_extreme_temp).astype(int)

    # Count each category
    num_disrupted = df["disrupted"].sum()
    num_normal = len(df) - num_disrupted
    percent_disrupted = (num_disrupted / len(df)) * 100

    print(f"Results:")
    print(f"Normal days: {num_normal}")
    print(f"Disrupted days: {num_disrupted}")
    print(f"Disruption rate: {percent_disrupted:.1f}%")

    # Warn if the split is very uneven
    if num_disrupted < 10 or num_normal < 10:
        print("Warning: Very few days in one category.")

    return df


# ------------------------------------------ CREATE FEATURE VARIABLES ------------------------------------------

def create_features(df):
    """
    Create the features that will be used in analysis.
    These are the same factors used in scoring formula:

    score = rain * rain_weight + wind * wind_weight + temp_deviation * temp_weight

    Find the best values for those weights.
    """
    print("\nStep 3: Creating features...")

    # Raw millimeters of rain
    df["rain_factor"] = df["rain"]

    # Raw wind speed in m/s
    df["wind_factor"] = df["wind"]

    # How far from the ideal temperature
    # Use abs value so both hot and cold count as bad
    df["temp_factor"] = abs(df["temp"] - IDEAL_TEMP)

    # Print stats for verification
    print(f"Rain range: {df['rain_factor'].min():.1f} to {df['rain_factor'].max():.1f} mm")
    print(f"Wind range: {df['wind_factor'].min():.1f} to {df['wind_factor'].max():.1f} m/s")
    print(f"Temp deviation range: {df['temp_factor'].min():.1f} to {df['temp_factor'].max():.1f} C")

    return df


# ------------------------------------------ REGRESSION ------------------------------------------

def analyze_importance(df):
    """
    Find which weather factors are most
    important for predicting if a day is disrupted.
    """
    print("\nStep 4: Running statistical analysis...")

    # Prepare the data for analysis
    # X = the features
    # y = the labels
    feature_names = ["rain_factor", "wind_factor", "temp_factor"]
    X = df[feature_names].values
    y = df["disrupted"].values

    print(f"Analyzing {len(X)} data points with {len(feature_names)} features")

    # Run logistic regression
    # max_iter=1000 gives it enough tries to find the best answer
    regression = LogisticRegression(max_iter=1000, random_state=0)
    regression.fit(X, y)

    # Get the coefficients (importance)
    coefficients = regression.coef_[0]

    print(f"Raw coefficients:")
    print(f"Rain: {coefficients[0]:.4f}")
    print(f"Wind: {coefficients[1]:.4f}")
    print(f"Temp: {coefficients[2]:.4f}")

    return coefficients


# ------------------------------------------ CONVERT TO USABLE WEIGHTS ------------------------------------------

def calculate_weights(coefficients):
    print("\nStep 5: Calculating final weights...")

    # Take absolute values since we want all factors to contribute
    # positively to the disruption score
    abs_coefficients = [abs(c) for c in coefficients]

    # Scale so they sum to 13
    total = sum(abs_coefficients)

    if total == 0:
        # Error check
        print("Warning: Coefficients were all zero. Using defaults.")
        return {"rain": 5.0, "wind": 6.0, "temp": 2.0}

    scale_factor = 13.0 / total

    weights = {
        "rain": round(abs_coefficients[0] * scale_factor, 2),
        "wind": round(abs_coefficients[1] * scale_factor, 2),
        "temp": round(abs_coefficients[2] * scale_factor, 2)
    }

    print(f"Final weights:")
    print(f"Rain: {weights['rain']}")
    print(f"Wind: {weights['wind']}")
    print(f"Temp: {weights['temp']}")

    return weights


# ------------------------------------------ SAVE TO FILE ------------------------------------------

def save_weights(weights):
    print(f"\nStep 6: Saving to {OUTPUT_FILE}...")

    output = {
        "description": "Weather disruption weights based on historical data analysis",
        "generated": datetime.now().strftime("%Y-%m-%d"),
        "data_sources": f"{len(CITIES)} US cities, {DAYS_TO_ANALYZE} days each",
        "weights": weights
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    print("Done!")


# ------------------------------------------ MAIN FUNCTION ------------------------------------------

def main():

    print("Weather Disruption Analysis")

    # Get the data
    df = download_weather_data()

    # Label good vs bad days
    df = label_days(df)

    # Create the features
    df = create_features(df)

    # Run the analysis
    coefficients = analyze_importance(df)

    # Calculate usable weights
    weights = calculate_weights(coefficients)

    # Save to file
    save_weights(weights)

    print("Analysis complete!")


if __name__ == "__main__":
    main()