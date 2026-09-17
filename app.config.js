module.exports = {
  expo: {
    name: 'cachorro',
    slug: 'cachorro',
    owner: 'felixbeccar',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'cachorro',
    userInterfaceStyle: 'dark',
    runtimeVersion: {
      policy: 'fingerprint',
    },
    updates: {
      url: 'https://u.expo.dev/e3ee72a0-0029-483c-b983-e2a64c8bb679',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.felixbeccar.cachorro',
    },
    android: {
      package: 'com.felixbeccar.cachorro',
      adaptiveIcon: {
        backgroundColor: '#0B0F0D',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          resizeMode: 'contain',
          backgroundColor: '#0B0F0D',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#4FB88A',
        },
      ],
      'expo-updates',
      'expo-secure-store',
      [
        'expo-speech-recognition',
        {
          microphonePermission: 'Cachorro uses the microphone to hear voice commands during your workout.',
          speechRecognitionPermission: 'Cachorro uses speech recognition to turn what you say into workout updates.',
        },
      ],
      './plugins/withHealthKit',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: 'e3ee72a0-0029-483c-b983-e2a64c8bb679',
      },
    },
  },
};
