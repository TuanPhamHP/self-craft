<script setup lang="ts">
/**
 * Default layout — top navbar 2 tầng:
 *  Row 1 (global): Home + module tabs. Luôn hiển thị.
 *  Row 2 (contextual): actions của module hiện tại. Chỉ hiển thị khi đang trong 1 module.
 *
 * Thêm module mới = thêm 1 entry vào `modules[]` — layout tự có tab + sub-nav.
 * Không hardcode English-specific ở đây.
 */
const { user, clear: clearSession } = useUserSession()
const route = useRoute()

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clearSession()
  await navigateTo('/login', { replace: true })
}

interface NavItem {
  label: string
  icon: string
  to: string
}

interface ModuleConfig extends NavItem {
  /** Route prefix để detect "đang trong module này". */
  prefix: string
  /** Actions của module (hiện ở sub-nav). */
  subLinks: NavItem[]
}

// Registry module. Thêm Vietnamese/Programming khi P2/P3 — chỉ thêm 1 entry.
const modules: ModuleConfig[] = [
  {
    label: 'English',
    icon: 'i-lucide-book-open',
    to: '/english',
    prefix: '/english',
    subLinks: [
      { label: 'CEFR', icon: 'i-lucide-graduation-cap', to: '/english' },
      { label: 'Review', icon: 'i-lucide-layers', to: '/english/review' },
      { label: 'Tra từ', icon: 'i-lucide-search', to: '/english/search' },
      { label: 'Thêm từ', icon: 'i-lucide-plus', to: '/english/add' },
    ],
  },
]

const topLinks = computed<NavItem[]>(() => [
  { label: 'Home', icon: 'i-lucide-home', to: '/' },
  ...modules.map((m) => ({ label: m.label, icon: m.icon, to: m.to })),
])

/** Module đang active theo route hiện tại — null nếu ở Home/admin/... */
const activeModule = computed<ModuleConfig | null>(
  () => modules.find((m) => route.path.startsWith(m.prefix)) ?? null,
)

function isActiveTop(item: NavItem): boolean {
  // Home: exact. Module tab: prefix match qua activeModule cùng `to`.
  if (item.to === '/') return route.path === '/'
  return activeModule.value?.to === item.to
}

function isActiveSub(item: NavItem): boolean {
  return route.path === item.to
}
</script>

<template>
  <div class="relative min-h-screen bg-neutral-950 text-neutral-100">
    <!-- Ambient background -->
    <div
      class="pointer-events-none fixed -top-40 -left-40 h-[420px] w-[420px] rounded-full bg-indigo-600/10 blur-[130px]"
    />
    <div
      class="pointer-events-none fixed -bottom-40 -right-40 h-[420px] w-[420px] rounded-full bg-fuchsia-600/10 blur-[130px]"
    />

    <!-- Sticky top nav -->
    <header
      class="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/70 backdrop-blur-xl"
    >
      <!-- Row 1: global (Home + module tabs) -->
      <div
        class="mx-auto flex h-14 max-w-5xl items-center gap-3 px-3 sm:gap-4 sm:px-4"
      >
        <!-- Brand -->
        <NuxtLink to="/" class="group flex shrink-0 items-center gap-2.5">
          <div class="relative">
            <div
              class="absolute inset-0 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 opacity-60 blur-md transition group-hover:opacity-90"
            />
            <div
              class="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 ring-1 ring-white/20"
            >
              <UIcon name="i-lucide-sparkles" class="h-4 w-4 text-white" />
            </div>
          </div>
          <span
            class="hidden bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-base font-semibold tracking-tight text-transparent sm:inline"
          >
            Self Craft
          </span>
        </NuxtLink>

        <div class="hidden h-6 w-px bg-white/10 sm:block" />

        <nav class="flex flex-1 items-center gap-1 overflow-x-auto">
          <NuxtLink
            v-for="l in topLinks"
            :key="l.to"
            :to="l.to"
            :aria-label="l.label"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition"
            :class="
              isActiveTop(l)
                ? 'bg-white/10 text-white ring-1 ring-white/15'
                : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-100'
            "
          >
            <UIcon :name="l.icon" class="h-4 w-4 shrink-0" />
            <span class="hidden sm:inline">{{ l.label }}</span>
          </NuxtLink>
        </nav>

        <!-- User cluster -->
        <div class="flex shrink-0 items-center gap-1">
          <span
            v-if="user"
            class="mr-1 hidden max-w-[160px] truncate text-xs text-neutral-400 md:inline"
          >
            {{ user.name ?? user.email }}
          </span>
          <UButton
            v-if="user?.isAdmin"
            to="/admin/invites"
            size="sm"
            variant="ghost"
            color="neutral"
            icon="i-lucide-mail-plus"
            square
            aria-label="Invite"
          />
          <UButton
            size="sm"
            variant="ghost"
            color="neutral"
            icon="i-lucide-log-out"
            square
            aria-label="Logout"
            @click="logout"
          />
        </div>
      </div>

      <!-- Row 2: contextual sub-nav (chỉ khi đang trong module) -->
      <div
        v-if="activeModule"
        class="border-t border-white/5 bg-neutral-950/40"
      >
        <div
          class="mx-auto flex h-11 max-w-5xl items-center gap-1 overflow-x-auto px-3 sm:px-4"
        >
          <UIcon
            :name="activeModule.icon"
            class="mr-1 h-3.5 w-3.5 shrink-0 text-neutral-500"
          />
          <span
            class="mr-2 shrink-0 text-xs uppercase tracking-wider text-neutral-500"
          >
            {{ activeModule.label }}
          </span>
          <div class="mr-2 h-4 w-px shrink-0 bg-white/5" />
          <NuxtLink
            v-for="s in activeModule.subLinks"
            :key="s.to"
            :to="s.to"
            :aria-label="s.label"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition"
            :class="
              isActiveSub(s)
                ? 'bg-white/10 text-white'
                : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-100'
            "
          >
            <UIcon :name="s.icon" class="h-3.5 w-3.5 shrink-0" />
            <span>{{ s.label }}</span>
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="relative mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <slot />
    </main>

    <!-- Onboarding: hỏi tên nếu user chưa nhập. Self-controlled component. -->
    <AskNameModal />
  </div>
</template>
