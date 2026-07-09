/**
 * MQTT Configuration for IoT sensor ingestion.
 *
 * Set MQTT_BROKER_URL in .env to enable live hardware.
 * Defaults to a mock local broker for development.
 *
 * This module exports an MQTT client factory. The actual connection
 * is established in index.ts during server startup.
 */

export const mqttConfig = {
  brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  options: {
    clientId: `omnicampus-server-${process.pid}`,
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
    reconnectPeriod: 5000,
    connectTimeout: 10000,
    clean: true,
  },
  topics: {
    sensors: 'campus/+/sensors/+',       // All resource sensors
    vehicleGps: 'campus/vehicles/+/gps', // Vehicle GPS updates
    rfidScans: 'campus/rfid/+/scan',     // RFID reader scans
  },
};

export function isMqttEnabled(): boolean {
  return !!process.env.MQTT_BROKER_URL;
}
