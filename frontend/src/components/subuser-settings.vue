<script setup lang="ts">
import { ref } from 'vue'
import {
    FwbTab,
    FwbTabs,
    FwbSelect,
    FwbPagination,
    FwbAlert
} from 'flowbite-vue'
import { computedAsync } from '@vueuse/core'
import login from '../../src/js/ggebot'
import VueCountdown from '@chenfengyuan/vue-countdown'
import PluginView from './plugin-view.vue'
import ws from '../js/webSocket.ts'
import UserAction from '../../../modules/CUserAction.ts'
const { closeModal, lang } : 
    { readonly closeModal? : Function, readonly lang? : { [key : string] : string } } = defineProps(['closeModal', 'lang']) 
if(closeModal == undefined) throw new Error("Define close Modal")

const name = ref('')
const password = ref('')
const log = ref()
const server = ref("1")
const instances = computedAsync(() => import('../js/serverInstances.ts').then(i => i.default), [])

const currentPage = ref(1)
let loginToken = ""
const validateUser = () => new Promise((resolve, reject) => {
    if(instances.value == undefined)
        return

    const { zone, server : gameURL } = instances.value.find(({ value }) => server.value == value) ?? {} as { zone : string, server : string }
    if(zone == undefined || gameURL == undefined) return
    return resolve(loginToken = "fake val")
    const loginEvents = login(name.value, password.value, zone, gameURL)
    loginEvents.addEventListener("TIMEOUT", ({ detail: timeout } : any) => {
        log.value = {
            type: "TIMEOUT",
            value: timeout
        }
        console.log(timeout)
    })
    loginEvents.addEventListener("ERROR", ({ detail: { r } } : any) => {
        switch (r) {
            case 21:
                log.value = `User not found`
                break
            default:
                log.value = `Unknown Error ${r}`
        }
        reject()
    })
    loginEvents.addEventListener("LOGGEDIN", ({ detail } : any) => resolve(loginToken = detail))
})
const closePage = () => {
    currentPage.value = 1
    closeModal()

    ws.send(JSON.stringify([UserAction.add, {
        name : name.value,
        loginToken,
        plugins: {},
        serverType: 'default',
        server : server.value
    }]))
}
const totalPages = 3
</script>
<template>
    <div class="flex flex-col border-b border-default pb-4 md:pb-5 text-left" v-show="currentPage == 1">
        <div class="p-2 pt-0">
            <label for="username" class="block mb-2.5 text-sm font-medium text-heading w-fit">Username</label>
            <input type="text" name="username" v-model="name"
                class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                required />
        </div>
        <div class="p-2 pt-0">
            <label for="password" class="block mb-2.5 text-sm font-medium text-heading w-fit">Password</label>
            <input type="password" v-model="password" name="password" autocomplete="on"
                class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                placeholder="••••••••" required />
        </div>
        <fwb-select v-model="server" :options="instances" label="Server" class="p-2 pt-0 min-w-fit" placeholder="" required
            selectClass="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body" />
        <fwb-alert v-if="typeof log === 'string'" type="danger" class="mr-2 ml-2 mt-1">
            {{ log }}
        </fwb-alert>
        <fwb-alert v-else-if="log !== undefined && log.type == 'TIMEOUT'" type="warning" class="mr-2 ml-2 mt-1">
            <vue-countdown :time="log.value * 1000" v-slot="{ minutes, seconds }">
                Waiting {{ minutes }} minutes, {{ seconds }} seconds before continuing
            </vue-countdown>
        </fwb-alert>
    </div>
    <div class="flex flex-col border-b border-default pb-4 md:pb-5 text-left" v-show="currentPage == 2">
         <PluginView/>
    </div>
    <fwb-pagination v-model="currentPage" :layout="'navigation'" :total-pages="totalPages" large class="mt-4">
        <template #prev-button hidden />
        <template #next-button="{ disabled, increasePage }">
            <button
                class="disabled:cursor-not-allowed ml-0 m-auto flex h-8 items-center justify-center border border-purple-300 bg-purple-200 px-4 py-4 leading-tight text-gray-500 first:rounded-l-lg last:rounded-r-lg hover:bg-purple-300 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                :disabled="disabled" @click="currentPage == totalPages - 1 ? closePage() : validateUser().then(increasePage)">
                {{ currentPage != totalPages -1 ? "Next" : "Save"}}
            </button>
        </template>
    </fwb-pagination>
</template>