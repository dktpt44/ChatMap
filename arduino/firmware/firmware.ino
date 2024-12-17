#define CAMERA_MODEL_XIAO_ESP32S3
#include <I2S.h>
#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include "esp_camera.h"
#include "camera_pins.h"

// Device Information Service
#define DEVICE_INFORMATION_SERVICE_UUID (uint16_t)0x180A
#define MANUFACTURER_NAME_STRING_CHAR_UUID (uint16_t)0x2A29
#define MODEL_NUMBER_STRING_CHAR_UUID (uint16_t)0x2A24
#define FIRMWARE_REVISION_STRING_CHAR_UUID (uint16_t)0x2A26
#define HARDWARE_REVISION_STRING_CHAR_UUID (uint16_t)0x2A27

// Battery Level Service
#define BATTERY_SERVICE_UUID (uint16_t)0x180F
#define BATTERY_LEVEL_CHAR_UUID (uint16_t)0x2A19

// Main Friend Service
static BLEUUID serviceUUID("19B10000-E8F2-537E-4F6C-D104768A1214");
static BLEUUID photoCharUUID("19B10005-E8F2-537E-4F6C-D104768A1214");

BLECharacteristic *photo;
bool connected = false;

BLECharacteristic *pBatteryLevelCharacteristic;
uint8_t batteryLevel = 100;
unsigned long lastBatteryUpdate = 0;

class ServerHandler: public BLEServerCallbacks
{
  void onConnect(BLEServer *server)
  {
    connected = true;
    Serial.println("Connected");
  }

  void onDisconnect(BLEServer *server)
  {
    connected = false;
    Serial.println("Disconnected");
    BLEDevice::startAdvertising();
  }
};

class MessageHandler: public BLECharacteristicCallbacks
{
  void onWrite(BLECharacteristic* pCharacteristic, esp_ble_gatts_cb_param_t* param)
  {
    // Currently unused
  }
};

void configure_ble() {
  BLEDevice::init("ChatMap");
  BLEServer *server = BLEDevice::createServer();
  BLEService *service = server->createService(serviceUUID);

  // Photo service
  photo = service->createCharacteristic(
    photoCharUUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  BLE2902 *ccc = new BLE2902();
  ccc->setNotifications(true);
  photo->addDescriptor(ccc);

  // Device Information Service
  BLEService *deviceInfoService = server->createService(DEVICE_INFORMATION_SERVICE_UUID);
  BLECharacteristic *pManufacturerNameCharacteristic = deviceInfoService->createCharacteristic(
      MANUFACTURER_NAME_STRING_CHAR_UUID,
      BLECharacteristic::PROPERTY_READ);
  BLECharacteristic *pModelNumberCharacteristic = deviceInfoService->createCharacteristic(
      MODEL_NUMBER_STRING_CHAR_UUID,
      BLECharacteristic::PROPERTY_READ);
  BLECharacteristic *pFirmwareRevisionCharacteristic = deviceInfoService->createCharacteristic(
      FIRMWARE_REVISION_STRING_CHAR_UUID,
      BLECharacteristic::PROPERTY_READ);
  BLECharacteristic *pHardwareRevisionCharacteristic = deviceInfoService->createCharacteristic(
      HARDWARE_REVISION_STRING_CHAR_UUID,
      BLECharacteristic::PROPERTY_READ);

  pManufacturerNameCharacteristic->setValue("Chat Map");
  pModelNumberCharacteristic->setValue("ChatMap");
  pFirmwareRevisionCharacteristic->setValue("1.0.1");
  pHardwareRevisionCharacteristic->setValue("Seeed Xiao ESP32S3 Sense");

  // Battery Service
  BLEService *batteryService = server->createService(BATTERY_SERVICE_UUID);
  pBatteryLevelCharacteristic = batteryService->createCharacteristic(
      BATTERY_LEVEL_CHAR_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  pBatteryLevelCharacteristic->addDescriptor(new BLE2902());

  // Service
  service->start();
  deviceInfoService->start();
  batteryService->start();

  server->setCallbacks(new ServerHandler());

  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(BATTERY_SERVICE_UUID);
  advertising->addServiceUUID(DEVICE_INFORMATION_SERVICE_UUID);
  advertising->addServiceUUID(service->getUUID());
  advertising->setScanResponse(true);
  advertising->setMinPreferred(0x06);
  advertising->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();
}


camera_fb_t *fb;

bool take_photo() {

  // Release buffer
  if (fb) {
    Serial.println("Release FB");
    esp_camera_fb_return(fb);
  }

  // Take a photo
  Serial.println("Taking photo...");
  fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Failed to get camera frame buffer");
    return false;
  }

  return true;
}

void configure_camera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.frame_size = FRAMESIZE_UXGA;
  config.pixel_format = PIXFORMAT_JPEG; // for streaming
  config.fb_count = 1;

  // High quality (psram)
  // config.fb_count = 2;

  // Low quality (and in local ram)
  config.jpeg_quality = 10;
  config.frame_size = FRAMESIZE_XGA;
  config.grab_mode = CAMERA_GRAB_LATEST;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  // config.fb_location = CAMERA_FB_IN_DRAM;

  // camera init
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
}

void updateBatteryLevel()
{
  // TODO:
  pBatteryLevelCharacteristic->setValue(&batteryLevel, 1);
  pBatteryLevelCharacteristic->notify();
}


void setup() {
  Serial.begin(921600);
  Serial.println("Starting BLE...");
  configure_ble();
  Serial.println("Starting Camera...");
  configure_camera();
  Serial.println("Ready.");
}

uint16_t frame_count = 0;
unsigned long lastCaptureTime = 0;
size_t sent_photo_bytes = 0;
size_t sent_photo_frames = 0;
bool need_send_photo = false;

static uint8_t *s_compressed_frame_2 = nullptr;
static size_t compressed_buffer_size = 400 + 3;


void loop() {

  if (!s_compressed_frame_2)
  {
    s_compressed_frame_2 = (uint8_t *)ps_calloc(compressed_buffer_size, sizeof(uint8_t));
  }

  // Take a photo
  unsigned long now = millis();
  if ((now - lastCaptureTime) >= 2000 && !need_send_photo && connected) {
    if (take_photo()) {
      need_send_photo = true;
      sent_photo_bytes = 0;
      sent_photo_frames = 0;
      lastCaptureTime = now;
    }
  }

  // Push to BLE
  if (need_send_photo) {
    size_t remaining = fb->len - sent_photo_bytes;
    if (remaining > 0) {
      // Populate buffer
      s_compressed_frame_2[0] = sent_photo_frames & 0xFF;
      s_compressed_frame_2[1] = (sent_photo_frames >> 8) & 0xFF;
      size_t bytes_to_copy = remaining;
      if (bytes_to_copy > 180) {
        bytes_to_copy = 180;
      }
      memcpy(&s_compressed_frame_2[2], &fb->buf[sent_photo_bytes], bytes_to_copy);

      // Push to BLE
      photo->setValue(s_compressed_frame_2, bytes_to_copy + 2);
      photo->notify();
      sent_photo_bytes += bytes_to_copy;
      sent_photo_frames++;
    } else {

      // End flag
      s_compressed_frame_2[0] = 0xFF;
      s_compressed_frame_2[1] = 0xFF;
      photo->setValue(s_compressed_frame_2, 2);
      photo->notify();

      Serial.println("Photo sent");
      need_send_photo = false;
    }
  }

  if (millis() - lastBatteryUpdate > 60000)
  {
    updateBatteryLevel();
    lastBatteryUpdate = millis();
  }

  // Delay
  delay(1);
}