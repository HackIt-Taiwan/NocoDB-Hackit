<script setup lang="ts">
definePageMeta({
  requiresAuth: false,
  title: 'HackIt SSO',
})

const { appInfo, signedIn } = useGlobal()
const { api } = useApi({ useGlobalInstance: true })

const isLoading = ref(true)
const errorMessage = ref('')

// Check if user is already signed in
watchEffect(() => {
  if (signedIn.value) {
    navigateTo('/')
  }
})

onMounted(async () => {
  try {
    // Check if HackIt SSO is enabled
    if (!appInfo.value.hackitAuthEnabled) {
      errorMessage.value = 'HackIt SSO is not enabled'
      isLoading.value = false
      return
    }

    // If only HackIt SSO is enabled and email auth is disabled, redirect directly
    if (appInfo.value.disableEmailAuth && !appInfo.value.googleAuthEnabled) {
      window.location.href = `${appInfo.value.ncSiteUrl}/auth/hackit?state=hackit`
      return
    }

    isLoading.value = false
  } catch (error) {
    console.error('SSO check failed:', error)
    errorMessage.value = 'Failed to initialize SSO'
    isLoading.value = false
  }
})

function signInWithHackIt() {
  window.location.href = `${appInfo.value.ncSiteUrl}/auth/hackit?state=hackit`
}

function goToSignIn() {
  navigateTo('/signin')
}
</script>

<template>
  <div>
    <NuxtLayout>
      <div class="md:bg-primary bg-opacity-5 signin h-full min-h-[600px] flex flex-col justify-center items-center">
        <div
          class="bg-white mt-[60px] relative flex flex-col justify-center gap-2 w-full max-w-[500px] mx-auto p-8 md:(rounded-lg border-1 border-gray-200 shadow-xl)"
        >
          <LazyGeneralNocoIcon class="color-transition hover:(ring ring-accent ring-opacity-100)" :animate="isLoading" />

          <div class="self-center flex flex-col justify-center items-center text-center gap-4">
            <h1 class="prose-2xl font-bold my-4 w-full">HackIt SSO</h1>

            <div v-if="isLoading" class="flex items-center gap-2">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>{{ $t('general.loading') }}...</span>
            </div>

            <div v-else-if="errorMessage" class="text-red-500 text-sm">
              {{ errorMessage }}
            </div>

            <div v-else class="flex flex-col gap-4 items-center">
              <div class="text-gray-600 text-sm text-center">
                使用 HackIt 帳戶登入 NocoDB
              </div>

              <button
                class="scaling-btn bg-opacity-100 w-full max-w-xs"
                @click="signInWithHackIt"
              >
                <span class="flex items-center justify-center gap-2">
                  <MdiLogin />
                  透過 HackIt SSO 登入
                </span>
              </button>

              <div v-if="!appInfo.disableEmailAuth" class="text-center">
                <nuxt-link class="text-sm text-gray-500 underline" @click="goToSignIn">
                  使用其他方式登入
                </nuxt-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<style lang="scss">
.signin {
  .scaling-btn {
    @apply transition-all duration-200 ease-in-out;
    
    &:hover {
      @apply transform scale-105;
    }
    
    &:active {
      @apply transform scale-95;
    }
  }
}
</style> 