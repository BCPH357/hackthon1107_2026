import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
// 在畫面掛上去之前就套用字級與對比，避免一打開先閃一下小字
import './stores/display'
import './styles/base.css'

createApp(App).use(router).mount('#app')
