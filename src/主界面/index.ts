import { createApp } from 'vue';
import App from './App.vue';
import './styles.css';

$(() => {
  const app = createApp(App).use(createPinia());
  app.mount('#app');
  $(window).on('pagehide', () => app.unmount());
});
