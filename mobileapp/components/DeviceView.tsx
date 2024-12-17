import * as React from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, View, Switch, Pressable, useColorScheme, Platform, PermissionsAndroid, Alert, LogBox } from 'react-native';
import axios from 'axios';
import * as Speech from 'expo-speech';
import Voice from '@react-native-voice/voice';
import { Colors } from '@/constants/Colors';

import Ionicons from '@expo/vector-icons/Ionicons';

LogBox.ignoreLogs(['new NativeEventEmitter()']);

export const DeviceView = (props: { latestPhoto: string | null }) => {
  const [voiceInputSwitch, setVoiceInputSwitch] = React.useState<boolean>(true);
  const [inferRequestProcessing, setInferRequestProcessing] = React.useState<boolean>(false);
  const [chatHistory, setChatHistory] = React.useState<any>([]);
  const [latestUserPrompt, setLatestUserPrompt] = React.useState<string | null>('To begin, please ask a question to the assistant.');
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [recordingAudio, setRecordingAudio] = React.useState<boolean>(false);
  const [assistantAnswer, setAssistantAnswer] = React.useState<string>('');
  const [bottomViewHeight, setBottomViewHeight] = React.useState(0);

  const scrollViewRef = React.useRef<ScrollView>(null);

  // function to check microphone permission
  const checkMicrophonePermission = async () => {
    if (Platform.OS === 'ios') {
      return true;
    }
    if (Platform.OS === 'android') {
      const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (hasPermission) {
        return true;
      } else {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        } else {
          return false;
        }
      }
    }
  };

  // function to make the request to the assistant in the backend
  const makeRequest = async (userTypedPrompt: string | null) => {
    setInferRequestProcessing(true);
    const imgToSave = props.latestPhoto;

    // console.log('Making requestPrompt => ', userTypedPrompt);

    // make request to the assistant
    if (!props.latestPhoto) {
      setAssistantAnswer('No images found to process.');
      setInferRequestProcessing(false);
      return;
    }
    // if no prompt
    if (!userTypedPrompt) {
      setAssistantAnswer('No prompt given. Please provide a prompt to the assistant.');
      setInferRequestProcessing(false);
      return;
    }
    let reqEndPoint = 'http://cai-003.abudhabi.nyu.edu:54345/process_image';
    let requestBody: any = { image: props.latestPhoto, prompt: userTypedPrompt };
    if (chatHistory.length > 0) {
      reqEndPoint = 'http://cai-003.abudhabi.nyu.edu:54345/chat_completion';
      requestBody = [];
      chatHistory.forEach((chat: any) => {
        requestBody.push(
          {
            role: 'user',
            content: chat.userPrompt
          },
          {
            role: 'assistant',
            content: chat.assistantAnswer
          }
        );
      });
      requestBody.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imgToSave } },
          { type: 'text', text: userTypedPrompt }
        ]
      });
    }

    try {
      const response = await axios.post(reqEndPoint, requestBody);

      // console.log(response.data.choices[0].message);
      const chatLenrn = chatHistory.length + 1;

      if (response.status === 200) {
        // check if esists
        if (response.data.choices[0].message.content) {
          setAssistantAnswer(response.data.choices[0].message.content);
          // add to chat history
          setChatHistory((prevState: any) => {
            return [...prevState, { userPrompt: userTypedPrompt + ' (' + chatLenrn + '/5)', assistantAnswer: response.data.choices[0].message.content, imageDisplay: imgToSave }];
          });
          // console.log('response', response.data.choices[0].message.content);
          Speech.speak(response.data.choices[0].message.content);
          setLatestUserPrompt('Pease ask a new question.');
        } else {
          setAssistantAnswer('No answer from the assistant at the moment.');
        }
      }
      // catch error
    } catch (error) {
      console.log('error', error);
      setAssistantAnswer('Something went wrong, sorry.');
    }
    setInferRequestProcessing(false);
  };

  // called when prompt changes
  React.useEffect(() => {
    if (inferRequestProcessing) {
      return;
    }
    if (!latestUserPrompt || latestUserPrompt === '' || latestUserPrompt === 'To begin, please ask a question to the assistant.' || latestUserPrompt === 'Listening...') {
      return;
    }
    if (props.latestPhoto) {
      makeRequest(latestUserPrompt);
    } else {
      // say that no images has been captured yet
      Speech.speak('No images have been captured yet. Please try again.');
    }
  }, [latestUserPrompt]);

  React.useEffect(() => {
    Voice.onSpeechStart = () => {
      Speech.stop();
    };
    Voice.onSpeechEnd = () => {
      console.log('onSpeechEnd');
    };
    Voice.onSpeechResults = (e: any) => {
      if (e.value[0] === '') {
        Speech.speak('Sorry, I could not hear you.');
        return;
      }
      setRecordingAudio(false);
      setLatestUserPrompt(e.value[0]);
    };
    Voice.onSpeechError = async (e) => {
      // console.log('something went wrong in speech to text::', e);
      Speech.speak('Sorry, error in interpretation. Please try again.');
      setLatestUserPrompt('To begin, please ask a question to the assistant.');
      setRecordingAudio(false);
    };
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ padding: 5 }}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
        {/* // dynamically render user chat history  */}
        {chatHistory.map((chat: any, index: number) => (
          <View
            key={index}
            style={{ flexDirection: 'column', flexWrap: 'wrap', gap: 12, backgroundColor: colors.conversationItemBgColor, borderRadius: 5, marginBottom: 18, padding: 5 }}>
            {/* // user prompt  */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Image
                source={require('../assets/usr.png')}
                style={{ width: 35, height: 35, borderRadius: 50 }}
              />
              <Text style={{ flex: 1, color: 'white', fontSize: 16, textAlign: 'left', padding: 0, verticalAlign: 'middle' }}>{chat.userPrompt}</Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: -8, paddingLeft: 42 }}>
              <Image
                style={{ width: 240, height: 240, borderRadius: 5, borderWidth: 1, borderColor: 'darkgreen' }}
                source={{ uri: chat.imageDisplay }}
              />
            </View>

            {/* // assistant response  */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 12 }}>
              <Image
                source={require('../assets/bot.png')}
                style={{ width: 35, height: 35, borderRadius: 50 }}
              />
              <Text style={{ flex: 1, color: 'white', fontSize: 16, textAlign: 'left', padding: 0, verticalAlign: 'middle' }}>{chat.assistantAnswer}</Text>
            </View>
          </View>
        ))}

        {/* for the latest user back and forth  */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 5 }}>
          <Image
            source={require('../assets/usr.png')}
            style={{ width: 35, height: 35, borderRadius: 50 }}
          />

          <Text style={{ flex: 1, color: 'white', fontSize: 16, textAlign: 'left', padding: 0, verticalAlign: 'middle' }}>{latestUserPrompt}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 10, justifyContent: 'center', alignItems: 'center' }}>
          {props.latestPhoto && (
            <Image
              style={{ width: 240, height: 240, borderRadius: 5, borderWidth: 1, borderColor: 'darkgreen' }}
              source={{ uri: props.latestPhoto }}
            />
          )}
          {!props.latestPhoto && (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator
                size="large"
                color={'white'}
              />

              <Text style={{ color: 'white', fontSize: 16, marginBottom: 40 }}>Getting image...</Text>
            </View>
          )}
        </View>

        {/* clear button  */}
        {chatHistory.length > 0 && (
          <Pressable
            style={{ flexDirection: 'row', maxWidth: 250, marginLeft: 'auto', marginRight: 'auto', backgroundColor: colors.error, padding: 6, borderRadius: 15, marginBottom: bottomViewHeight, marginTop: 20, paddingLeft: 12, paddingRight: 12, justifyContent: 'center', alignItems: 'center' }}
            disabled={inferRequestProcessing || chatHistory.length === 0}
            onPress={() => {
              setChatHistory([]);
              setLatestUserPrompt('To begin, please ask a question to the assistant.');
              setAssistantAnswer('');
              Speech.stop();
              Speech.speak('Chat history cleared.');
            }}>
            <Ionicons
              name="trash-bin"
              size={24}
              color={'white'}
            />
            <Text style={{ color: 'white', fontSize: 16 }}>Clear Chat</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* input content  */}

      {chatHistory.length <= 4 && (
        <View
          style={{ width: '100%', padding: 10, position: 'absolute', bottom: 18 }}
          onLayout={(event) => {
            setBottomViewHeight(event.nativeEvent.layout.height + 28);
          }}>
          <View style={{ backgroundColor: 'rgb(28 28 28)', width: '100%', borderRadius: 5, flexDirection: 'column', paddingLeft: 12, paddingRight: 12 }}>
            {/* for switch  */}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingLeft: 8, marginTop: 18 }}>
              <Text style={{ color: 'white', fontSize: 16 }}>Voice Input</Text>
              <Switch
                value={voiceInputSwitch}
                onValueChange={() => {
                  if (inferRequestProcessing) {
                    return;
                  }
                  setVoiceInputSwitch(!voiceInputSwitch);
                }}
              />
            </View>

            <View style={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
              {recordingAudio && <Text style={{ color: 'white', fontSize: 16, textAlign: 'center' }}>Recording...</Text>}
              {inferRequestProcessing && (
                <ActivityIndicator
                  size="small"
                  color={'white'}
                />
              )}
              {!inferRequestProcessing && assistantAnswer && !recordingAudio && (
                <ScrollView style={{ flexGrow: 1, flexBasis: 0 }}>
                  <Text style={{ color: 'white', fontSize: 14 }}>{assistantAnswer}</Text>
                </ScrollView>
              )}
            </View>

            {/* for speech input  */}

            {voiceInputSwitch && (
              <Pressable
                style={{ width: '50%', borderColor: recordingAudio ? colors.error : colors.success, borderWidth: 1, borderRadius: 5, marginLeft: 'auto', marginRight: 'auto', marginBottom: 24, padding: 8, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 4 }}
                onPress={async () => {
                  if (inferRequestProcessing) {
                    return;
                  }
                  setAssistantAnswer('');
                  const hasPermission = await checkMicrophonePermission();
                  if (!hasPermission) {
                    Alert.alert('Permission Denied', 'Please enable microphone permission to use this feature.');
                    return;
                  }
                  if (recordingAudio) {
                    try {
                      Voice.removeAllListeners();
                      await Voice.stop();
                    } catch (error) {
                      console.log('Error in voice, error:', error);
                    }
                  } else {
                    setLatestUserPrompt('Listening...');
                    try {
                      await Voice.start('en-US');
                    } catch (error) {
                      console.log('error', error);
                    }
                  }
                  setRecordingAudio(!recordingAudio);
                }}>
                <Ionicons
                  name={recordingAudio ? 'mic-circle' : 'mic-off-circle'}
                  size={32}
                  color={recordingAudio ? 'red' : 'lightgreen'}
                />
                <Text style={{ color: 'white', fontSize: 16, textAlign: 'center' }}>{recordingAudio ? 'Stop Recording' : 'Start Recording'}</Text>
              </Pressable>
            )}

            {/* for text input  */}
            {!voiceInputSwitch && (
              <TextInput
                style={{ color: 'white', fontSize: 16, borderRadius: 4, backgroundColor: 'rgb(48 48 48)', padding: 4, marginBottom: 14 }}
                placeholder="Enter your prompt"
                placeholderTextColor={'#888'}
                readOnly={inferRequestProcessing}
                onSubmitEditing={(e) => {
                  setLatestUserPrompt(e.nativeEvent.text);
                }}
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
};
