<script setup lang="ts">
/**
 * AuthShell — layout dùng chung cho các page auth (login, register, forgot, reset).
 * Ambient gradient orbs + glass card + brand block.
 * Slot mặc định = nội dung form (bên trong glass card).
 */
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div
    class="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 text-neutral-100"
  >
    <div
      class="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-indigo-600/25 blur-[130px]"
    />
    <div
      class="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-fuchsia-600/20 blur-[130px]"
    />
    <div
      class="pointer-events-none absolute top-1/2 left-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/10 blur-[130px]"
    />

    <div
      class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
    />

    <div class="relative z-10 w-full max-w-md px-6">
      <div class="mb-10 flex flex-col items-center text-center">
        <div class="relative mb-5">
          <div
            class="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 opacity-70 blur-xl"
          />
          <div
            class="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 ring-1 ring-white/20"
          >
            <UIcon name="i-lucide-sparkles" class="h-7 w-7 text-white" />
          </div>
        </div>

        <h1
          class="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-3xl font-semibold tracking-tight text-transparent"
        >
          Self Craft
        </h1>
        <p class="mt-2 text-sm text-neutral-400">
          Personal learning workspace — English &amp; Programming
        </p>
      </div>

      <div
        class="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7"
      >
        <div class="mb-5">
          <h2 class="text-lg font-medium text-white">{{ title }}</h2>
          <p v-if="subtitle" class="mt-1 text-xs text-neutral-400">
            {{ subtitle }}
          </p>
        </div>

        <slot />
      </div>

      <p class="mt-6 text-center text-xs text-neutral-500">
        Powered by
        <span class="text-neutral-300">SRS engine</span>
        · ts-fsrs
      </p>
    </div>
  </div>
</template>
