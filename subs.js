import mqtt from 'mqtt';
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';

// Configuration class to centralize environment setup and validation
class ConfigManager {
  constructor() {
    // Load environment variables
    dotenv.config();

    // Validate required environment variables
    this.validateEnvironmentVariables();
  }

  validateEnvironmentVariables() {
    const requiredVars = [
      'MQTT_BROKER_URL', 
      'MQTT_PORT', 
      'TOPIC', 
      'DISCORD_WEBHOOK_URL'
    ];

    const missingVars = requiredVars.filter(variable => !process.env[variable]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }

  getMqttOptions() {
    return {
      port: process.env.MQTT_PORT,
      clientId: `mqtt-discord-bridge-${Date.now()}`, // Ensure unique client ID
      rejectUnauthorized: false,
      ca: fs.readFileSync('./ca.crt'), // Verify correct path
    };
  }

  get brokerUrl() {
    return process.env.MQTT_BROKER_URL;
  }

  get topic() {
    return process.env.TOPIC;
  }

  get discordWebhookUrl() {
    return process.env.DISCORD_WEBHOOK_URL;
  }
}

// Discord message formatter
class DiscordMessageFormatter {
  static format(message) {
    return {
      content: '**🏢 Apartment Vacancy Update**',
      embeds: [
        {
          color: 0x1abc9c,
          title: 'Details of Available Apartments',
          fields: [
            { name: `📅 Date: ${message.date || 'N/A'}`, value: '\u200b', inline: false },
            { name: `⏰ Time: ${message.time || 'N/A'}`, value: '\u200b', inline: false },
            { name: `📊 Total Vacant: ${message.count || 0}`, value: '\u200b', inline: false },
            { name: `🏠 Shared Apartments: ${message.shared || 0}`, value: '\u200b', inline: false },
            { name: `🛏️ Studio Apartments: ${message.studio || 0}`, value: '\u200b', inline: false },
            { name: `👨‍👩‍👧‍👦 Family Apartments: ${message.family || 0}`, value: '\u200b', inline: false },
            // add addresses in the value fields
            { name: '📍 Addresses', value: message.addresses, inline: true},
            { 
              name: '🔗 Link', 
              value: '[View Apartments](https://www.psoas.fi/en/apartments/?_sfm_huoneistojen_tilanne=vapaa_ja_vapautumassa)', 
              inline: false 
            },
          ],
          footer: { text: 'Vacancy data received via MQTT' },
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}

// MQTT to Discord bridge
class MqttDiscordBridge {
  constructor(configManager) {
    this.configManager = configManager;
    this.client = null;
  }

  async sendToDiscord(message) {
    try {
      const parsedMessage = JSON.parse(message);
      console.log('Parsed MQTT message:', parsedMessage);

      const payload = DiscordMessageFormatter.format(parsedMessage);
      console.log('Payload for Discord:', payload);

      await axios.post(this.configManager.discordWebhookUrl, payload);
      console.log('Message successfully sent to Discord!');
    } catch (error) {
      console.error('Error sending message to Discord:', error.message);
    }
  }

  connect() {
    // Create MQTT client
    this.client = mqtt.connect(
      this.configManager.brokerUrl, 
      this.configManager.getMqttOptions()
    );

    // Handle connection
    this.client.on('connect', () => {
      console.log('Connected to MQTT broker');
      
      this.client.subscribe(this.configManager.topic, {}, (err) => {
        if (err) {
          console.error('Subscription error:', err);
        } else {
          console.log(`Subscribed to topic: ${this.configManager.topic}`);
        }
      });
    });

    // Listen for messages and forward to Discord
    this.client.on('message', (receivedTopic, message) => {
      try {
        console.log(`Received message on topic '${receivedTopic}': ${message.toString()}`);
        this.sendToDiscord(message.toString());
      } catch (error) {
        console.error('Error processing received message:', error.message);
      }
    });

    // Handle connection errors
    this.client.on('error', (err) => {
      console.error('Connection error:', err);
    });
  }
}

// Main execution
async function main() {
  try {
    // Initialize configuration manager
    const configManager = new ConfigManager();

    // Create and start MQTT to Discord bridge
    const bridge = new MqttDiscordBridge(configManager);
    bridge.connect();
  } catch (error) {
    console.error('Initialization error:', error.message);
    process.exit(1);
  }
}

// Run the application
main();