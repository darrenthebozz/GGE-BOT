<script setup lang="ts">
import { ref } from 'vue'
import {
    FwbSelect,
    FwbPagination,
    FwbAlert
} from 'flowbite-vue'
import { computedAsync } from '@vueuse/core'
import login from '../js/ggebot.ts'
import VueCountdown from '@chenfengyuan/vue-countdown'
import PluginView from './plugin-view.vue'
import ws from '../js/webSocket.ts'
import UserAction from '../../../modules/CUserAction.ts'
import { FwbButton, FwbModal } from 'flowbite-vue'

const isShowModal = ref(false)
const closeModal = () => isShowModal.value = false
const showModal = () => isShowModal.value = true

const { lang } : { readonly lang? : { [key : string] : string } } = defineProps(['lang']) 

const name = ref('')
const password = ref('')
const log = ref()
const server = ref("1")
const instances = computedAsync(() => import('../../../modules/serverInstances.ts').then(i => i.default), [])

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

</script>
<template>
    <div class="w-full flex flex-row-reverse">
        <fwb-button @click="showModal"
            class="p-2 md:p-4 text-heading text-sm border border-default rounded-base shadow hover:text-blue-600"
            color="transparent"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                stroke-width="1.5" stroke="currentColor" class="size-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
        </fwb-button>
    </div>

    <fwb-modal @close="closeModal" v-show="isShowModal" header-class="bg-neutral-primary-soft"
        bodyClass="bg-neutral-primary-soft text-white text-right" size="5xl" wrapper-class="max-w-svw md:m-4 m-0">
        <template #body>
            <PluginView />
        </template>
    </fwb-modal>
</template>