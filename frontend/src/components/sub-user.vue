<script setup lang='ts'>
import { reactive } from 'vue'
import CastleView from './castle-view.vue'
import UserAction from '../../../modules/CUserAction.ts'
import webSocket from '../js/webSocket.ts'
import type { Ref } from 'vue'
import type User from '../../../modules/IUser.ts'

const props = defineProps(['user']) as { user : Ref<User> }
const user = reactive(props.user)
const server = props.user.value.server
const log = () => alert("test")
const settings = () => {}
const changeUserState = () => 
        webSocket.send(JSON.stringify([UserAction.change, { id: user.value.id, state: user.value.state }]))
const deleteUser = () => 
        webSocket.send(JSON.stringify([UserAction.delete, user.value.id]))

</script>
<template>
        <div class="p-2 md:p-4 text-heading text-sm border border-default rounded-base shadow">
                <div class="flex flex-row">
                        <div class="p-2 grid grid-flow-col grid-rows-2 text-left">
                                <dt class="mr-2 text-body">Name</dt>
                                <dd class="mr-2 text-lg font-medium">{{ user.name }}</dd>
                                <dt class="mr-2 text-body">Server</dt>
                                <dd class="mr-2 text-lg font-medium">{{ server }}</dd>
                        </div>
                        <div class="ml-auto mb-auto mt-auto mr-1 whitespace-nowrap flex flex-row gap-2">
                                        <svg 
                                                v-on:click="log"
                                                class="w-5 h-5 hover:text-blue-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                                                fill="none" viewBox="0 0 16 20">
                                                <path stroke="currentColor" stroke-linecap="round"
                                                        stroke-linejoin="round" stroke-width="1"
                                                        d="M1 17V2a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h12M5 15V1m8 18v-4">
                                                </path>
                                        </svg>
                                        <svg 
                                                v-on:click="settings"
                                                class="w-5 h-5 hover:text-blue-600" aria-hidden="true"
                                                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                                <path stroke="currentColor" stroke-linecap="round"
                                                        stroke-linejoin="round" stroke-width="1"
                                                        d="M4 12.25V1m0 11.25a2.25 2.25 0 0 0 0 4.5m0-4.5a2.25 2.25 0 0 1 0 4.5M4 19v-2.25m6-13.5V1m0 2.25a2.25 2.25 0 0 0 0 4.5m0-4.5a2.25 2.25 0 0 1 0 4.5M10 19V7.75m6 4.5V1m0 11.25a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5ZM16 19v-2"/>
                                        </svg>
                                        <svg 
                                                v-show="!user.state"
                                                v-on:click="user.state = true, changeUserState()"
                                                class="w-5 h-5 hover:text-blue-600"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="3 0 10 16">
                                                <path 
                                                        stroke="currentColor"
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="1"
                                                        d="m2.707 14.293 5.586-5.586a1 1 0 0 0 0-1.414L2.707 1.707A1 1 0 0 0 1 2.414v11.172a1 1 0 0 0 1.707.707Z"/>
                                        </svg>
                                        <svg
                                                v-show="user.state"
                                                v-on:click="user.state = false, changeUserState()"
                                                class="w-5 h-5 hover:text-blue-600"
                                                xmlns="http://www.w3.org/2000/svg" 
                                                fill="none" 
                                                viewBox="0 0 25 22"
                                                >
                                                <path 
                                                        stroke="currentColor"
                                                        stroke-linecap="round" 
                                                        stroke-linejoin="round"
                                                        stroke-width="1"
                                                d="M12 0v22m-10 -22v22" />
                                        </svg>
                        </div>
                </div>
                <CastleView :player="user" />
                <svg 
                        v-on:click="deleteUser()"
                        class="m-auto mr-2.5 md:mt-4 mt-2 w-5.5 h-5.5 hover:text-blue-600 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18 17.94 6M18 18 6.06 6" />
                </svg>
        </div>
</template>