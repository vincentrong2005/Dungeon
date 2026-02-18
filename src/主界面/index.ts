import { createApp } from 'vue';
import App from './App.vue';
import './styles.css';

$(() => {
  const app = createApp(App).use(createPinia());
  app.mount('#app');
  $(window).on('pagehide', () => app.unmount());

  // 隐藏旧楼层实现伪同层：只保留最新一楼
  $('#chat > .mes').not('.last_mes').remove();

  // 当聊天文件变更时, 重新加载前端界面
  let current_chat_id = SillyTavern.getCurrentChatId();
  eventOn(tavern_events.CHAT_CHANGED, (chat_id: string) => {
    if (current_chat_id !== chat_id) {
      current_chat_id = chat_id;
      reloadIframe();
    }
  });
});
