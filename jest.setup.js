// c:\Users\thabi\Desktop\CloudExplorer\jest.setup.js
import 'react-native-gesture-handler/jestSetup'; // Standard mock provided by the library

// Silence the warning about Animated: `useNativeDriver` is not supported because the native animated module is missing
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Add any other global mocks or setup you need here.
// For example, if many tests need the react-native mock, you could move it here:
// jest.mock('react-native', () => ({ Platform: { OS: 'ios', select: jest.fn() }, Alert: { alert: jest.fn() } }));
// However, keeping specific mocks like Alert closer to the test using it can sometimes be clearer.