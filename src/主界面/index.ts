import { mountStreamingMessages } from '@util/streaming';
import App from './App.vue';

function initializeApp(): void {
  console.info('[主界面] 初始化流式界面');
  const { unmount } = mountStreamingMessages(
    () => {
      return createApp(App).use(createPinia());
    },
    { host: 'div' },
  );

  $(window).on('pagehide', () => {
    console.info('[主界面] 卸载流式界面');
    unmount();
  });
}

$(() => {
  errorCatched(initializeApp)();
});
