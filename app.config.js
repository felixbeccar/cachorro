module.exports = {
  expo: {
    name: 'cachorro',
    slug: 'cachorro',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'cachorro',
    userInterfaceStyle: 'dark',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.felixbeccar.cachorro',
    },
    android: {
      package: 'com.felixbeccar.cachorro',
      adaptiveIcon: {
        backgroundColor: '#0B0F14',
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
          backgroundColor: '#0B0F14',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#22D3EE',
        },
      ],
      './plugins/withHealthKit',
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};
