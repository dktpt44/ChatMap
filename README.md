# ChatMap - Building mobile app for smart glasses.

Welcome to ChatMap - Mobile app with ESP32S3 sense.

## Get Started

Follow these steps to set up 


### Hardware

1. Gather the required components:
   - [Seeed Studio XIAO ESP32 S3 Sense](https://www.amazon.com/dp/B0C69FFVHH/ref=dp_iou_view_item?ie=UTF8&psc=1)
   - [EEMB LP502030 3.7v 250mAH battery](https://www.amazon.com/EEMB-Battery-Rechargeable-Lithium-Connector/dp/B08VRZTHDL)
   - [3D printed glasses mount case](https://storage.googleapis.com/scott-misc/openglass_case.stl)

2. 3D print the glasses mount case using the provided STL file.

3. Open the firmware folder and open the `.ino` file in the Arduino IDE.
   - If you don't have the Arduino IDE installed, download and install it from the [official website](https://www.arduino.cc/en/software).

4. Follow the software preparation steps to set up the Arduino IDE for the XIAO ESP32S3 board:
   - Add ESP32 board package to your Arduino IDE:
     - Navigate to File > Preferences, and fill "Additional Boards Manager URLs" with the URL: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
     - Navigate to Tools > Board > Boards Manager..., type the keyword `esp32` in the search box, select the latest version of `esp32`, and install it. Install version (2.0.17 by Espressif Systems)
   - Select your board and port:
     - On top of the Arduino IDE, select the port (likely to be COM3 or higher).
     - Search for `xiao` in the development board on the left and select `XIAO_ESP32S3`.

5. Before you flash go to the "Tools" drop down in the Arduino IDE and make sure you set "PSRAM:" to be "PSRAM: "OPI PSRAM"

6. Upload the firmware to the XIAO ESP32S3 board.


### Software

1. Go inside mobilapp folder and install dependencies

   ```bash
   npm install
   ```

2. Connect a phone, in androids, enable USB debugging.  
  

3. Start the app  
  
  Do not run the app with expo go. It will not work. It is not yet designed to work in web. It only works in android and iphone. Also do not run in a simulator. Use a real device. Either

   ```bash
    npx expo run:android
   ```
   or
   
   ```bash
    npx expo run:ios
   ```

Fix any errors you get. There is plenty of documentation online.



## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).


## License

This project is licensed under the MIT License.