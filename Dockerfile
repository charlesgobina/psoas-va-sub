# Use the official Node.js image as the base image
FROM node:lts-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# env variables
ENV MQTT_BROKER_URL='mqtts://mqtt.cgobinak.rahtiapp.fi'
ENV TOPIC='vacant/allapartments'
ENV MQTT_PORT=443
ENV DISCORD_WEBHOOK_URL='https://discord.com/api/webhooks/1316911925765869679/41nef5efwuBNChp7ymXGnCNMx_6rkWHUud-Cu73xeFg3ryTJ80SQpOYsDCL-xggsfTmM'

# Serve the app
CMD ["npm", "start"]
