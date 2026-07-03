import { createApp } from './app'

const { app, router } = createApp()

router.go()
app.mount('#app')
