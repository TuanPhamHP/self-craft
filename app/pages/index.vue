<script setup lang="ts">
	/**
	 * / — dashboard entry.
	 * P1: chỉ hiển thị module cards. Streak/stats/due-count sẽ vào ở P2.
	 */
	const { user } = useUserSession();

	const modules = [
		{
			title: 'English',
			description: 'Học từ vựng theo Spaced Repetition.',
			icon: 'i-lucide-book-open',
			gradient: 'from-indigo-500 via-purple-500 to-fuchsia-500',
			home: '/english',
			actions: [
				{ label: 'Review', icon: 'i-lucide-layers', to: '/english/review', variant: 'solid' as const },
				{ label: 'Thêm từ', icon: 'i-lucide-plus', to: '/english/add', variant: 'soft' as const },
				{ label: 'CEFR', icon: 'i-lucide-info', to: '/english', variant: 'outline' as const },
			],
		},
		// P2: programming module sẽ thêm vào đây.
	];
</script>

<template>
	<div class="space-y-8">
		<!-- Greeting -->
		<div>
			<h1
				class="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl"
			>
				Chào {{ user?.name ?? 'bạn' }}
			</h1>
			<p class="mt-2 text-sm text-neutral-400">Chọn module để bắt đầu phiên học hôm nay.</p>
		</div>

		<!-- Module grid -->
		<div class="grid gap-4 sm:grid-cols-2">
			<div
				v-for="mod in modules"
				:key="mod.title"
				class="group relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/50 p-5 transition hover:border-white/20 hover:bg-neutral-900/70"
			>
				<div
					class="absolute inset-x-0 top-0 h-px bg-gradient-to-r opacity-70 transition group-hover:opacity-100"
					:class="mod.gradient"
				/>

				<div class="min-w-0 flex-1">
					<div class="flex items-start gap-4">
						<div class="relative shrink-0">
							<div class="absolute inset-0 rounded-xl bg-gradient-to-br opacity-40 blur-lg" :class="mod.gradient" />
							<div
								class="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-white/20"
								:class="mod.gradient"
							>
								<UIcon :name="mod.icon" class="h-5 w-5 text-white" />
							</div>
						</div>

						<div>
							<h2 class="text-lg font-medium text-white">{{ mod.title }}</h2>
							<p class="mt-1 text-sm text-neutral-400">{{ mod.description }}</p>
						</div>
					</div>
					<div class="mt-4 flex flex-wrap gap-2">
						<UButton
							v-for="a in mod.actions"
							:key="a.label"
							:to="a.to"
							:icon="a.icon"
							:variant="a.variant"
							size="sm"
							class="whitespace-nowrap"
						>
							{{ a.label }}
						</UButton>
					</div>
				</div>
			</div>

			<!-- Coming soon placeholder -->
			<div
				class="flex items-center justify-center rounded-2xl border border-dashed border-white/10 p-5 text-sm text-neutral-500"
			>
				<div class="text-center">
					<UIcon name="i-lucide-code-2" class="mx-auto mb-2 h-6 w-6 text-neutral-600" />
					Programming — coming soon (P2)
				</div>
			</div>
		</div>
	</div>
</template>
