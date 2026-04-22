const mockExpo = {
  chunkPushNotifications: (messages: any[]) => [messages],
  sendPushNotificationsAsync: async () => 
    [{ status: 'ok', id: 'mock-ticket-id' }],
}

class Expo {
  static isExpoPushToken(token: string) {
    return token.startsWith('ExponentPushToken')
  }
  chunkPushNotifications = mockExpo.chunkPushNotifications
  sendPushNotificationsAsync = mockExpo.sendPushNotificationsAsync
}

export default Expo
export type ExpoPushMessage = any
export type ExpoPushTicket = any