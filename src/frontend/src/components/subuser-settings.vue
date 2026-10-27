<script setup lang="ts">
import { ref, watch } from 'vue'
import {
    FwbSelect,
    FwbAccordion,
    FwbAccordionContent,
    FwbAccordionHeader,
    FwbAccordionPanel,
    FwbToggle,
    FwbTooltip,
    FwbInput,
    FwbModal,
    FwbAlert
} from 'flowbite-vue'
import VueCountdown from '@chenfengyuan/vue-countdown'
import createUserObject from '@modules/createUserObject.js'
import UserAction from '@modules/CUserAction.js'
import plugins from '@plugins/index'
import type { IUser, IPlugin } from '@bot/types.ts'
import type { TLog } from '../js/validateUser'
import validateUser from '../js/validateUser'
import instances from "../js/serverInstances"
import ws from '../js/webSocket'

const { user: _user, lang } = defineProps<Partial<{ user: IUser, lang: { [key: string]: string | undefined } }>>()
const isShowModal = ref(false)
const log = ref({} as Partial<TLog>)
const password = ref('')
const closeModal = () => isShowModal.value = false
const showModal = () => isShowModal.value = true
const user = ref<IUser>(_user ? _user : createUserObject())
watch(isShowModal, () => {
    if (!_user) {
        user.value = createUserObject()
        console.log(user.value)
    }
    password.value = ""
    log.value = {}
})
function submitForm() {
    validateUser(user.value, password.value, curlog => log.value = curlog).then(() => {
        ws.send(JSON.stringify([UserAction.change, { ...user.value, id: user.value.id }]))
        closeModal()
    }).catch(err => log.value = err)
}
</script>
<template>
    <svg @click="showModal" v-if="!_user" xmlns="http://www.w3.org/2000/svg" 
    class="hover:text-blue-600 size-6" fill="none" viewBox="0 0 24 24"
                stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
    <svg @click="showModal" v-else class="w-5 h-5 hover:text-blue-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
        fill="none" viewBox="0 0 20 20">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
            d="M4 12.25V1m0 11.25a2.25 2.25 0 0 0 0 4.5m0-4.5a2.25 2.25 0 0 1 0 4.5M4 19v-2.25m6-13.5V1m0 2.25a2.25 2.25 0 0 0 0 4.5m0-4.5a2.25 2.25 0 0 1 0 4.5M10 19V7.75m6 4.5V1m0 11.25a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5ZM16 19v-2" />
    </svg>
    <fwb-modal @close="closeModal" v-if="isShowModal" header-class="bg-neutral-primary-soft"
        bodyClass="bg-neutral-primary-soft text-white text-right" size="5xl" wrapper-class="max-w-svw md:m-4 m-0"
        class="absolute">
        <template #body>
            <form @submit.prevent="submitForm()">
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
                        placeholder="••••••••" :required="!_user" />
                </div>
                <div class="p-2 pt-0">
                    <label class="block mb-2.5 text-sm font-medium text-heading w-fit">Server</label>
                    <fwb-select
                        :options="instances.map(i => ({ name: `${lang?.[i.name] ?? i.name} ${i.serverInstance}`, value: String(i.value) }))"
                        v-model="user.serverid as unknown as string" required
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
                <div
                    class="flex flex-col max-h-96 overflow-y-auto scrollbar-color scrollbar-thumb-[#2D2E36] scrollbar-track-[#05040C] scrollbar-thin">
                    <fwb-accordion collapsed flushed v-for="{ key, description, options } in plugins as IPlugin[]">
                        <fwb-accordion-panel>
                            <fwb-accordion-header class="p-2">
                                <div class="whitespace-nowrap w-full flex flex-row">
                                    <div class="m-auto ml-0">{{ key }}</div>
                                    <div class="m-auto mr-0 pt-2">
                                        <fwb-toggle v-model="user.plugins[key].state" color="green" />
                                    </div>
                                </div>
                            </fwb-accordion-header>
                            <fwb-accordion-content class="bg-transparent p-0 text-left">
                                <div class="bg-[#171718] p-2" v-if="description">{{ description }}</div>
                                <div v-for="[key2, { type, description }] in Object.entries(options)" :key="key2"
                                    class="flex flex-row m-2">
                                    <div class="flex-row flex">
                                        <div class="m-auto pr-2">{{ key2 }}</div>
                                        <fwb-toggle v-model="user.plugins[key][key2]" :reverse="true"
                                            v-if="type == 'Toggle'" />
                                        <fwb-input v-model="user.plugins[key][key2]" type="number"
                                            v-if="type == 'Number'" class="size-8 w-full" />
                                    </div>
                                    <fwb-tooltip>
                                        <template #trigger>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                                strokeWidth={1.5} stroke="currentColor" className="size-6">
                                                <path strokeLinecap="round" strokeLinejoin="round"
                                                    d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                                            </svg>
                                        </template>
                                        <template #content v-if="description">
                                            {{ description }}
                                        </template>
                                    </fwb-tooltip>
                                </div>
                            </fwb-accordion-content>
                        </fwb-accordion-panel>
                    </fwb-accordion>
                </div>
                <div class="flex flex-row w-full">
                    <fwb-alert class="text-left flex-1 m-1" v-if="log.type == 'ERROR'" type="danger">
                        {{ log.value }}
                    </fwb-alert>
                    <fwb-alert class="text-left flex-1 m-1" v-else-if="log.type == 'TIMEOUT'" type="warning">
                        <vue-countdown :time="log.value! * 1000" v-slot="{ minutes, seconds }">
                            Waiting {{ minutes }} minutes, {{ seconds }} seconds before continuing
                        </vue-countdown>
                    </fwb-alert>
                    <fwb-alert class="text-left flex-1 m-1" v-else type="info">
                        {{ log.value ?? "" }}
                    </fwb-alert>
                    <button
                        class="m-1 text-white bg-neutral-secondary-medium box-border border border-transparent hover:bg-blue-600 focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">Save</button>
                </div>
            </form>
        </template>
    </fwb-modal>
</template>