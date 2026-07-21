<script setup lang="ts">
import { ref, watch } from 'vue'
import {
    FwbAccordion,
    FwbAccordionContent,
    FwbAccordionHeader,
    FwbAccordionPanel,
    FwbToggle,
    FwbTooltip,
    FwbInput
} from 'flowbite-vue'

enum PluginOptionType {
    Toggle,
    Number
}

class PluginOption {
    id: string
    type: PluginOptionType
    description?: string
    value?: any
    hideLabel?: boolean

    constructor(o: any) {
        this.id = o.id
        this.type = o.type
        this.description = o.description
        this.hideLabel = o.hideLabel
        this.value = o.value
    }
}

class Plugin {
    name: string
    description: string
    options: PluginOption[]
    state : boolean
    constructor(o: any) {
        this.name = o.name
        this.description = o.description
        this.options = o.options
        this.state = o.state
    }
}

const plugins = ref([new Plugin({
    name: "Attack Barrons (Empire)",
    description: "blahblahblahblah",
    options: [new PluginOption({
        id: "fuckingOptionIdk",
        type: PluginOptionType.Toggle,
        description: "Hello world",
    })],
    state : false
})])

plugins.value.forEach((plugin) =>  {
    watch(plugin, option => {
    console.log(plugin)
    })
})

</script>
<template>
    <div
        class="flex flex-col max-h-96 overflow-y-auto scrollbar-color scrollbar-thumb-[#2D2E36] scrollbar-track-[#05040C] scrollbar-thin">
        <fwb-accordion collapsed flushed v-for="({ name, description, options, state }, index) in plugins">
            <fwb-accordion-panel>
                <fwb-accordion-header class="p-2">
                    <div class="whitespace-nowrap w-full flex flex-row">
                        <div class="m-auto ml-0">{{ name }}</div>
                        <div class="m-auto mr-0 pt-2"><fwb-toggle v-model="plugins[index].state" color="green" /></div>
                    </div>
                </fwb-accordion-header>
                <fwb-accordion-content class="bg-transparent p-0">
                    <div class="bg-[#171718] p-2">{{ description }}</div>
                    <div v-for="({ type, description, id }, index) in options" :key="id" class="flex flex-row m-2">
                        <fwb-toggle v-model="options[index].value" :label="id" v-if="type == PluginOptionType.Toggle" />
                        <fwb-input v-model="options[index].value" :label="id" type="number"
                            v-if="type == PluginOptionType.Number" />
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
</template>
