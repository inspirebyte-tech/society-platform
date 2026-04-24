export default {
  expo: {
    name: "Vaastio",
    slug: "vaastio",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "cover",
      backgroundColor: "#2f3e4e"
    },
    ios: {
      supportsTablet: true
    },
    android: {
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#2f3e4e"
      },
      package: "com.inspirebyte.vaastio",
      edgeToEdgeEnabled: false,
      predictiveBackGestureEnabled: false
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: ["expo-font"],
    extra: {
      eas: {
        projectId: "482ccdae-8d10-49d6-b9c6-cd140036a1b0"
      }
    },
    owner: "mohitgauniyal"
  }
}
