<script setup lang="ts">
import { ref } from 'vue'
import {
    FwbSelect,
    FwbAlert,
    FwbButton, FwbModal
} from 'flowbite-vue'
import { computedAsync } from '@vueuse/core'
import login from '../js/ggebot.ts'
import VueCountdown from '@chenfengyuan/vue-countdown'
import { IUser } from '../../../types.ts'
import userDefaults from '../../../modules/userDefaults.ts'
import ws from '../js/webSocket.ts'
import UserAction from '../../../modules/CUserAction.ts'

const isShowModal = ref(false)
const closeModal = () => isShowModal.value = false
const showModal = () => isShowModal.value = true
const { lang }: { readonly lang?: { [key: string]: string } } = defineProps(['lang'])
const log = ref()
const password = ref('')
const instances = computedAsync(() => import('../js/serverInstances.ts').then(i => i.default)!, [])
const validateUser = () => new Promise((resolve, reject) => {
    const { zone, server: gameURL } = instances.value.find(({ value }) => Number(user.value.serverid) == value)!

    return resolve(user.value.logintoken = "fake val")
    const loginEvents = login(user.value.name, password.value, zone, gameURL)
    loginEvents.addEventListener("TIMEOUT", ({ detail: timeout }: any) => {
        log.value = {
            type: "TIMEOUT",
            value: timeout
        }
        console.log(timeout)
    })
    loginEvents.addEventListener("ERROR", ({ detail: { r } }: any) => {
        switch (r) {
            case 21:
                log.value = `User not found`
                break
            default:
                log.value = `Unknown Error ${r}`
        }
        reject()
    })
    loginEvents.addEventListener("LOGGEDIN", ({ detail }: any) => resolve(user.value.logintoken = detail))
})
const user = ref<IUser>(Object.create(userDefaults))
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
        <template #body class="flex flex-col border-b border-default pb-4 md:pb-5 text-left">
            <form  @submit.prevent="() => {
                        validateUser().then(() => {
                            closeModal()
                            console.log({ ...user })
                            ws.send(JSON.stringify([UserAction.add, { ...user }]))
                        })
                    }">
                <div class="p-2 pt-0">
                    <label for="username" class="block mb-2.5 text-sm font-medium text-heading w-fit">Username</label>
                    <input type="text" name="username" v-model="user.name"
                        class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                        required />
                </div>
                <div class="p-2 pt-0">
                    <label for="password" class="block mb-2.5 text-sm font-medium text-heading w-fit">Password</label>
                    <input type="password" v-model="password" name="password" autocomplete="on"
                        class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                        placeholder="••••••••" required />
                </div>
                <div class="p-2 pt-0">
                    <label class="block mb-2.5 text-sm font-medium text-heading w-fit">Server</label>
                    <fwb-select
                        :options="instances.map(i => ({ name: `${lang?.[i.name] ?? i.name} ${i.serverInstance}`, value: String(i.value) }))"
                        v-model="user.serverid" required
                        class="border border-default-medium bg-neutral-secondary-medium dark:bg-neutral-secondary-medium text-heading text-sm focus:ring-brand focus:border-brand block w-full pl-2 py-2.5">
                    </fwb-select>
                </div>
                <div class="p-2 pt-0">
                    <label class="block mb-2.5 text-sm font-medium text-heading w-fit">Server</label>
                    <fwb-select :options="[
                        { value: 'default', name: 'Default' },
                        { value: 'horizon', name: 'Horizon' },
                        { value: 'outerRealm', name: 'Outer Realm' },
                    ]" v-model="user.servertype" required
                        class="border border-default-medium bg-neutral-secondary-medium dark:bg-neutral-secondary-medium text-heading text-sm focus:ring-brand focus:border-brand block w-full pl-2 py-2.5">
                    </fwb-select>
                </div>
                <fwb-alert v-if="typeof log === 'string'" type="danger" class="mr-2 ml-2 mt-1">
                    {{ log }}
                </fwb-alert>
                <fwb-alert v-else-if="log !== undefined && log.type == 'TIMEOUT'" type="warning" class="mr-2 ml-2 mt-1">
                    <vue-countdown :time="log.value * 1000" v-slot="{ minutes, seconds }">
                        Waiting {{ minutes }} minutes, {{ seconds }} seconds before continuing
                    </vue-countdown>
                </fwb-alert>
                <button type="submit"
                    class="m-2 text-white bg-neutral-secondary-medium box-border border border-transparent hover:bg-blue-600 focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">Finish</button>
            </form>
        </template>
    </fwb-modal>
</template>