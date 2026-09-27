<style>
@import "tailwindcss";
@import "flowbite-vue/index.css";
@plugin "flowbite/plugin";
@source "../../node_modules/flowbite-vue";
</style>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { initFlowbite } from 'flowbite'
import SubUser from "./sub-user.vue"
import Setup from "./subuser-settings.vue"
import UserAction from '../../../modules/CUserAction.ts'
import userDefaults from '../../../modules/userDefaults.ts'
import ws from '../js/webSocket.ts'
import type { IUser } from '../../../types.d.ts'

const lang = await fetch("/lang/en").then(a => a.json())
const users = ref<IUser[]>([])

function createUserObject(obj: IUser) {
  const user = { ...structuredClone(userDefaults), ...obj }
  user.plugins = { ...structuredClone(userDefaults.plugins), ...user.plugins }
  return user
}

ws.addEventListener("message", ({ data }: any) => {
  const [action, ...obj]: [Number, any] = JSON.parse(data.toString())
  switch (action) {
    case UserAction.get:
      users.value = obj.map(createUserObject)
      break
    case UserAction.change: {
      const userIndex = users.value.findIndex(user => user.id == obj[0].id)
      if (userIndex == -1)
        users.value.push(createUserObject(obj[0]))
      else
        Object.assign(users.value[userIndex], obj[0])
      break
    }
    case UserAction.delete: {
      const userIndex = users.value.findIndex(user => user.id == obj[0])
      if (userIndex == undefined)
        break

      users.value.splice(userIndex, 1)
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
  <div class="p-2 md:p-4 text-heading text-sm border border-default rounded-base shadow w-full flex flex-row-reverse">
    <Setup :lang="lang"/>
  </div>
  <span v-for="user in users" class="overflow-x-hidden">
    <SubUser :user="user" :lang="lang" />
  </span>
</template>
