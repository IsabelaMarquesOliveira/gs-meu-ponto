import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Faz a notificação aparecer mesmo com o app aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 1) Pede permissão para enviar notificações. Retorna true se a usuária aceitar.
export async function pedirPermissaoNotificacao() {
  // No Android, criamos um "canal" de notificação.
  // Se der erro (acontece em algumas versões do Expo Go), seguimos com o canal padrão.
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Avisos de ônibus',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 500, 300, 500],
        lightColor: '#2E7D32',
        enableVibrate: true,
        showBadge: true,
      });
    } catch (erro) {
      console.log('Não foi possível criar o canal, usando o padrão:', erro.message);
    }
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// 2) Envia uma notificação local na hora (trigger: null = imediatamente)
export async function enviarNotificacao(titulo, mensagem) {
  await Notifications.scheduleNotificationAsync({
    content: { title: titulo, body: mensagem },
    trigger: null,
  });
}