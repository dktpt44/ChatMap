import React, { useEffect, useState } from 'react';
import { Text, View, Pressable, StyleSheet, SafeAreaView, ImageBackground, StatusBar, useColorScheme, Alert, Modal, Linking, ActivityIndicator } from 'react-native';
import useBLE from '@/hooks/useBLE';
import { Colors } from '@/constants/Colors';
import { DeviceView } from '@/components/DeviceView';

export default function Index() {
  const { blePoweredOn, requestBluetoothPermission, scanForPeripherals, allDevices, connectToDevice, deviceConnected, latestPhoto } = useBLE();

  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  useEffect(() => {
    if (deviceConnected === 'connectionLost') {
      Alert.alert('Connection Lost', 'Please reconnect to the device to continue.');
    }
  }, [deviceConnected]);

  const hideModal = () => {
    setIsModalVisible(false);
  };

  const openModal = async () => {
    console.log('Requesting permissions');
    const isPermissionsEnabled = await requestBluetoothPermission();
    if (isPermissionsEnabled) {
      console.log('Scanning for devices');
      setIsModalVisible(true);
      scanForPeripherals();
    } else {
      Alert.alert(
        'Permission Required',
        'This app needs access to your Bluetooth and location to function properly.',
        [
          {
            text: 'Cancel',
            onPress: () => console.log('Cancel Pressed'),
            style: 'cancel'
          },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ],
        { cancelable: false }
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ImageBackground
        source={require('../assets/bg_ai.png')}
        resizeMode="cover"
        style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        {(!(deviceConnected === 'connected') || !blePoweredOn) && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' }}>
            <View style={{ flex: 5, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' }}>
              <Text style={{ color: colors.text, fontSize: 26, textAlign: 'center', fontWeight: '800' }}>Welcome!</Text>
            </View>
            <View style={{ flex: 6, justifyContent: 'flex-start', alignItems: 'center', alignSelf: 'center' }}>
              <Text style={{ color: colors.text, fontSize: 16, paddingLeft: 45, paddingRight: 45, marginBottom: 45, textAlign: 'center' }}>Please make sure bluetooth is enabled on the device and permissions are granted.</Text>

              <Pressable
                onPress={() => {
                  // check if bluetooth is enabled
                  if (blePoweredOn) {
                    openModal();
                  } else {
                    Alert.alert('Bluetooth is not enabled', 'Please enable bluetooth from device settings to continue.');
                  }
                }}
                style={[styles.connectButton, { backgroundColor: colors.buttonbgcolor }]}>
                <Text style={[styles.connectButtonText, { color: colors.buttonTextColor }]}>{'Scan for the device'}</Text>
              </Pressable>

              <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => {
                  Alert.alert('Cancel connection', 'Are you sure you want to close without connecting to any device?', [
                    {
                      text: 'Yes',
                      onPress: () => {
                        hideModal();
                      }
                    },
                    {
                      text: 'No',
                      onPress: () => {}
                    }
                  ]);
                }}>
                <View style={{ height: '50%', marginTop: 'auto', borderTopRightRadius: 20, borderTopLeftRadius: 20, backgroundColor: colors.modalBackground }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', paddingTop: 20, marginBottom: 20, color: colors.text }}>Select the device to connect</Text>

                  <ActivityIndicator
                    color={colors.success}
                    size="small"
                  />

                  {/* // map allDevices  */}
                  {allDevices.length > 0 ? (
                    allDevices.map((device, index) => (
                      <Pressable
                        key={index}
                        onPress={async () => {
                          await connectToDevice(device, (stat: string) => {
                            if (stat === 'connected') {
                              hideModal();
                            } else if (stat === 'failed') {
                              Alert.alert('Failed', 'Failed to request 184 MTU. Try again.');
                            } else {
                              Alert.alert('Failed to connect', 'Please try again.');
                            }
                          });
                        }}
                        style={{ justifyContent: 'center', alignItems: 'center', height: 50, width: '60%', maxWidth: 300, paddingLeft: 25, paddingRight: 25, borderRadius: 10, backgroundColor: colors.bluetoothItmColor, margin: 10, marginLeft: 'auto', marginRight: 'auto' }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>
                          {deviceConnected === 'connecting' ? (
                            <ActivityIndicator
                              color="white"
                              size="small"
                            />
                          ) : (
                            device.name
                          )}
                        </Text>
                      </Pressable>
                    ))
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', paddingTop: 30, color: colors.warning }}>No compatible devices found</Text>
                  )}
                </View>
              </Modal>
            </View>
          </View>
        )}
        {deviceConnected === 'connected' && (
          <DeviceView
          latestPhoto={latestPhoto}
          />
        )}
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center'
  },
  connectButton: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
    paddingLeft: 25,
    paddingRight: 25,
    borderRadius: 25
  },
  connectButtonText: {
    fontSize: 18,
    fontWeight: 'bold'
  }
});

{
  /* <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, alignItems: 'center', justifyContent: 'center' }}>
<ActivityIndicator color={display.textColor} size='small' />
</View> */
}
