// Jest manual mock for expo-server-sdk (ESM package)
const Expo = jest.fn().mockImplementation(() => ({
  sendPushNotificationsAsync: jest.fn().mockResolvedValue([]),
  chunkPushNotifications: jest.fn().mockReturnValue([]),
}));
(Expo as any).isExpoPushToken = jest.fn().mockReturnValue(true);
export default Expo;
export const ExpoPushMessage = {};
