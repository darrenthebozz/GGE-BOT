<style>
@import "tailwindcss";
@import "flowbite-vue/index.css";
@plugin "flowbite/plugin";
@source "../../node_modules/flowbite-vue";
</style>
<script setup lang="ts">
import { onMounted, ref, shallowRef, triggerRef } from 'vue'
import type { Ref } from 'vue'
import { initFlowbite } from 'flowbite'
import { computedAsync } from '@vueuse/core'
import SubUser from "./sub-user.vue"
import Setup from "./subuser-setup.vue"
import UserAction from '../../../modules/CUserAction.ts'
import ws from '../js/webSocket.ts'

import type { IUser } from '../../../types.d.ts'
import { userDefaults } from '../js/userDefaults.ts'

const lang = computedAsync<{ [key: string] : string | undefined }>(() => fetch("/lang/en").then(a => a.json()))

const users = shallowRef<Array<Ref<IUser | typeof userDefaults>>>([])

ws.addEventListener("message", ({ data }: any) => {
  const [action, ...obj] : [Number, any] = JSON.parse(data.toString())
  switch (action) {
    case UserAction.get:
      users.value = obj.map((user) => ref<IUser>(user))
      break
    case UserAction.change: {
      const userChanges = Object.create({ ...userDefaults, ...obj[0] as IUser })
      const user = users.value.find(user => user.value.id == userChanges.id)
      if (user == undefined) {
        users.value.push(ref<IUser>(userChanges))
        triggerRef(users)
        return
      }
      
      user.value = userChanges
      break
    }
    case UserAction.delete: {
      const userIndex = users.value.findIndex(user => user.value.id == obj[0])
      if(userIndex == undefined)
        break

      console.debug(users.value.splice(userIndex, 1))
      triggerRef(users)
      break
    }
  }
})

ws.addEventListener("close", ({ code }) => {
  if (code == 4000) {
    document.cookie = `uuid=`
    window.location.replace("/")
  }
})

onMounted(initFlowbite)
onMounted(() => ws.reconnect())
</script>
<template>
  <Setup :lang="lang"/>
  <span v-for="user in users" class="overflow-x-hidden">
    <SubUser :user="user" />
  </span>
</template>
