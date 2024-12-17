import { Stack } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";

export default function RootLayout() {
  const colors = useColorScheme() === "dark"? Colors.dark : Colors.light;
  return (
    <Stack>
      <Stack.Screen name="index" options={{title: 'ChatMap', headerStyle: {backgroundColor: colors.primary}, headerTitleStyle: {fontWeight: 'bold', color: 'white'}  }} />
    </Stack>
  );
}
