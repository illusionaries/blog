import '@app/assets/base.css'
import '@app/assets/codeblocks.css'
import '@app/assets/containers.css'
import '@app/assets/heimu.css'
import '@app/assets/math-common.css'
import '@app/assets/transitions.css'
import '@app/assets/inter/inter.css'

import { createSSRApp, createApp as createSPAApp } from 'vue'
import App from './App.vue'
import { createRouter, RouterSymbol } from './router/router.ts'
import ExpanderComponent from './components/ExpanderComponent.vue'
import BadgeComp from './components/BadgeComp.vue'
import GitHistory from './components/GitHistory.vue'
import { ClientOnly } from './components/ClientOnly.ts'
import { PageModulesInjectionKey, PageSplashesInjectionKey } from './injection.ts'
import { pageModules, pageSplashes } from 'virtual:modules'

export function createApp() {
  const app = import.meta.env.DEV ? createSPAApp(App) : createSSRApp(App)
  const router = createRouter()

  app.provide(RouterSymbol, router)
  app.provide(PageModulesInjectionKey, pageModules)
  app.provide(PageSplashesInjectionKey, pageSplashes)
  app.component('ExpanderComponent', ExpanderComponent)
  app.component('GitHistory', GitHistory)
  app.component('ClientOnly', ClientOnly)
  // eslint-disable-next-line vue/multi-word-component-names
  app.component('Badge', BadgeComp)
  return { app, router }
}
