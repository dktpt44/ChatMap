import { useMemo, useState, useCallback, useEffect } from 'react';
import { Device, Characteristic, BleError, BleManager, DeviceId } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';

interface BluetoothLowEnergyApi {
  blePoweredOn: boolean;
  requestBluetoothPermission(): Promise<boolean>;
  scanForPeripherals(): void;
  allDevices: Device[];
  connectToDevice: (deviceId: Device, callbckfn: (status: string) => void) => Promise<void>;
  deviceConnected: string;
  latestPhoto: string | null;
}

const SERVICE_UUID = '19B10000-E8F2-537E-4F6C-D104768A1214'.toLowerCase();
const PHOTO_CHARACTERISTIC = '19b10005-e8f2-537e-4f6c-d104768a1214';
// let imageData = ''; make it a buffer
let imageData = Buffer.from('');
let packetNum = -1;

export default function useBLE(): BluetoothLowEnergyApi {
  const bleManager = useMemo(() => new BleManager(), []);
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [blePoweredOn, setBleState] = useState<boolean>(false);
  const [deviceConnected, setDeviceConnected] = useState<string>('stagezero');
  const [latestPhoto, setLatestPhoto] = useState<string|null>(null);


  // method 1: check if bluetooh enabled or not
  const onStateChange = useCallback((state: string) => {
    setBleState(state === 'PoweredOn');
  }, []);
  useEffect(() => {
    console.log('Checking if bluetooth is enabled');
    bleManager.onStateChange(onStateChange, true);
  }, []);

  // method 2: request bluetooth permission
  const requestBluetoothPermission = async () => {
    if (Platform.OS === 'ios') {
      return true;
    }
    if (Platform.OS === 'android' && PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
      const apiLevel = parseInt(Platform.Version.toString(), 10);

      if (apiLevel < 31) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN && PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
        const result = await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]);

        return result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED && result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED && result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
      }
    }

    // this.showErrorToast('Permission have not been granted')

    return false;
  };

  // method 3: scan for devices
  const scanForPeripherals = () => {
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log(error);
        console.log('Error in scanning');
      }
      if (device && device.name?.includes('ChatMap')) {
        setAllDevices((prevState: Device[]) => {
          if (!(prevState.findIndex((d) => device.id === d.id) > -1)) {
            return [...prevState, device];
          }
          return prevState;
        });
      }
    });
  };

  // callback function to update data
  const onDataReceivedFromBLE = (error: BleError | null, characteristic: Characteristic | null) => {
    if (error) {
      console.log(error);
      return -1;
    } else if (!characteristic?.value) {
      console.log('No Data was recieved');
      return -1;
    }

    const frameBuffer = Buffer.from(characteristic.value, 'base64');
    if (frameBuffer.length === 2 && frameBuffer[0] === 0xff && frameBuffer[1] === 0xff) {
      // End of image flag
      if (packetNum === -1) {
        return;
      }
      // console.log('Image received correctly');
      const convImgDat = Buffer.from(imageData.buffer).toString('base64');
      packetNum = -1;
      const imageUri = `data:image/jpeg;base64,${convImgDat}`;
      setLatestPhoto(imageUri);
      imageData = Buffer.from('');
    } else {
      const packtNumber = frameBuffer[0] + (frameBuffer[1] << 8);
      // console.log(packtNumber);
      if (packetNum + 1 !== packtNumber) {
        imageData = Buffer.from('');
        packetNum = -1;
        return;
      }
      packetNum = packtNumber;
      imageData = Buffer.concat([imageData, Buffer.from(frameBuffer.subarray(2))]);
    }
  };

  // method 4: connect to device
  const connectToDevice = async (device: Device, callbckfn: (status: string) => void) => {
    setDeviceConnected('connecting');
    try {
      const deviceConnection = await bleManager.connectToDevice(device.id, { requestMTU: 512 });
      // print mtu
      console.log('Connected to device mtu: ', deviceConnection.mtu);
      const mtu = await deviceConnection.requestMTU(512);
      console.log('MTU:', mtu.mtu);
      if (mtu.mtu < 184) {
        console.log('MTU is less than 184');
        setDeviceConnected('failed');
        callbckfn('failed');
        return;
      }

      if (mtu.mtu) {
        await mtu.discoverAllServicesAndCharacteristics();
      }

      mtu.onDisconnected((error) => {
        if (error) {
          console.log('Disconnection error:', error);
        } else {
          console.log('Disconnected from device');
        }
        setDeviceConnected('connectionLost');
      });

      bleManager.stopDeviceScan();
      if (mtu) {
        mtu.monitorCharacteristicForService(SERVICE_UUID, PHOTO_CHARACTERISTIC, onDataReceivedFromBLE);
      } else {
        console.log('No Device Connected');
      }
      setDeviceConnected('connected');
      callbckfn('connected');
    } catch (e) {
      console.log('FAILED TO CONNECT', e);
      setDeviceConnected('failed');
      callbckfn('error');
    }
  };

  return { blePoweredOn, scanForPeripherals, requestBluetoothPermission, connectToDevice, allDevices, deviceConnected, latestPhoto };
}
