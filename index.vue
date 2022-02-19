<template lang="pug">
transition(name="fade-in" appear): canvas#sakura(
  ref="sakura"
  :width="width"
  :height="height"
  v-if="load"
  v-show="props['menu/effect/sakura']"
)
</template>

<script lang="ts" setup>
import { use_store } from "@/store";
import { nextTick, ref, watch } from "vue";
import render from "."
const sakura = ref<HTMLCanvasElement>();

const store = use_store()
const props = store.state.props
const width = window.innerWidth;
const height = window.innerHeight;

const load = ref(false)

const once = watch(()=>props['menu/effect/sakura'],(v)=>{
  if(!v) return
  load.value = true,
  nextTick(()=>once())
},{immediate:true})

const stop = watch(sakura,(canvas)=>{
  if(!canvas) return
  stop()
  const callback = render(canvas)
  if(!callback) return
  watch(()=>props["menu/effect/sakura"],(val)=>{
    store.commit("render_mode",{
      name:"sakura",
      callback,
      val,
    })
  },{immediate:true})
})

</script>